#!/usr/bin/env python3
"""Top up Telegram's native scheduled queue with complete daily psychology quizzes."""
import asyncio, json, os, random, re, sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from openpyxl import load_workbook
from telethon import TelegramClient, functions, types
from telethon.sessions import StringSession

ROOT=Path(__file__).resolve().parent
BOOK=ROOT/"data"/"question_bank.xlsx"
STATE=ROOT/"posted_ids.json"
IST=ZoneInfo("Asia/Kolkata")
DEFAULT_DAILY_QUESTION_COUNT=5
DEFAULT_TARGET_QUIZZES=7
DEFAULT_QUEUE_LIMIT=80
MESSAGE_GAP_MINUTES=1

def cell(row,*names):
    for name in names:
        value=row.get(name)
        if value is not None and str(value).strip(): return str(value).strip()
    return ""

def telegram_length(text):
    return len(text.encode("utf-16-le")) // 2

def split_telegram_text(text, limit=3500):
    """Split long material at paragraph/sentence/word boundaries, with a hard fallback."""
    if telegram_length(text) <= limit:
        return [text]
    chunks=[]
    current=""
    segments=[]
    for paragraph in text.split("\n"):
        if telegram_length(paragraph) <= limit:
            segments.append(paragraph)
            continue
        sentence_parts=re.split(r"(?<=[?.;])\s+",paragraph)
        for sentence in sentence_parts:
            if telegram_length(sentence) <= limit:
                segments.append(sentence)
                continue
            words=sentence.split()
            piece=""
            for word in words:
                candidate=(piece+" "+word).strip()
                if telegram_length(candidate)>limit and piece:
                    segments.append(piece)
                    piece=word
                else:
                    piece=candidate
            if piece:
                if telegram_length(piece)<=limit:
                    segments.append(piece)
                else:
                    # Handles a single unusually long token (e.g. an unbroken URL).
                    hard_piece=""
                    for char in piece:
                        if telegram_length(hard_piece+char)>limit and hard_piece:
                            segments.append(hard_piece)
                            hard_piece=char
                        else:
                            hard_piece+=char
                    if hard_piece:
                        segments.append(hard_piece)
    for segment in segments:
        candidate=(current+"\n"+segment).strip()
        if telegram_length(candidate)>limit and current:
            chunks.append(current)
            current=segment
        else:
            current=candidate
    if current:
        chunks.append(current)
    if any(telegram_length(chunk)>limit for chunk in chunks):
        raise RuntimeError("A question text part still exceeds the safe Telegram message size.")
    return chunks

def load_questions():
    wb=load_workbook(BOOK,read_only=True,data_only=True)
    ws=wb["Question Bank"] if "Question Bank" in wb.sheetnames else wb.active
    rows=ws.iter_rows(values_only=True)
    headers=[str(v).strip() if v is not None else "" for v in next(rows)]
    records=[]
    for row in rows:
        item=dict(zip(headers,row))
        parts=[cell(item,"Shared Passage / Case Context","Passage / Case Context"),
               cell(item,"Question / Instructions","Question"),
               cell(item,"List I — Items","List I - Items","List I"),
               cell(item,"List II — Items","List II - Items","List II")]
        question="\n\n".join(x for x in parts if x)
        options=[cell(item,f"Option {c}") for c in "ABCD"]
        raw=cell(item,"Correct Option","Answer (as printed in PDF)","Answer").upper()
        match=re.fullmatch(r"(?:OPTION\s*)?([ABCD])(?:[.)])?",raw)
        session=cell(item,"Exam Session","Exam Cycle / Session")
        paper=cell(item,"Paper")
        qno=cell(item,"Q No.","Question No.","Question Number")
        rid="|".join(x for x in (session,paper,qno) if x)
        source=" · ".join(x for x in (session,paper) if x)
        if not rid or not question or not match or any(not x for x in options):
            continue
        records.append({"id":rid,"question":question,"options":options,
                        "correct":"ABCD".index(match.group(1)),"source":source})
    wb.close()
    if not records:
        raise RuntimeError(f"No eligible questions in {ws.title!r}; columns={headers!r}")
    return records

def read_state():
    try:
        data=json.loads(STATE.read_text(encoding="utf-8"))
        return data if isinstance(data,list) else []
    except (OSError,ValueError):
        return []

def save_state(ids):
    STATE.write_text(json.dumps(ids,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

def question_material(q,index,count):
    source=f"\n\n📚 Source: {q['source']}" if q["source"] else ""
    # Keep answer choices exclusively inside Telegram's native quiz poll.
    # Repeating them in this text message makes the question appear twice.
    full=f"🧠 QUESTION {index+1}/{count}\n\n{q['question']}{source}"
    return split_telegram_text(full)

def quiz_message_count(selected):
    total=2  # introduction and closing message
    for index,q in enumerate(selected):
        total += len(question_material(q,index,len(selected))) + 1  # text parts + native poll
    return total

def choose_questions(all_questions,used_ids,count):
    unused=[q for q in all_questions if q["id"] not in used_ids]
    if len(unused)<count:
        used_ids.clear()
        unused=all_questions[:]
    if len(unused)<count:
        raise RuntimeError(f"Only {len(unused)} eligible questions; {count} required.")
    selected=random.SystemRandom().sample(unused,count)
    used_ids.update(q["id"] for q in selected)
    return selected

def build_intro(date_label,count):
    return f"""🧠 <b>NET JRF PSYCHOLOGY</b>
<i>Daily practice. Stronger concepts. Better scores.</i>
━━━━━━━━━━━━━━━━━━━━
🎯 <b>DAILY QUIZ CHALLENGE</b>
📅 {date_label}

Challenge yourself with <b>{count} exam-focused questions</b>.

📝 <b>HOW TO PARTICIPATE</b>
1. Read each question carefully.
2. Select your answer in the poll.
3. Check the correct answer after voting.

💡 <i>Attempt every question before checking your score.</i>
━━━━━━━━━━━━━━━━━━━━
👇 <b>Your quiz starts below. All the best!</b>"""

def build_outro():
    return ("🏁 <b>YOU'VE COMPLETED TODAY'S QUIZ!</b>\n"
            "How many answers did you get right?\n\n"
            "💬 Share your score in the comments.\n"
            "🔁 Challenge a friend preparing for NET/JRF.\n"
            "<i>Consistency turns preparation into progress.</i>")

def next_start_date(existing_quiz_dates,now):
    first=now.date()
    today_slot=datetime.combine(first,datetime.min.time(),tzinfo=IST).replace(hour=18,minute=0)
    if today_slot <= now+timedelta(minutes=10):
        first += timedelta(days=1)
    if existing_quiz_dates:
        latest=max(existing_quiz_dates)
        first=max(first,latest+timedelta(days=1))
    return first

async def schedule_quiz(client,peer,selected,quiz_date,posted_ids):
    count=len(selected)
    slot=datetime.combine(quiz_date,datetime.min.time(),tzinfo=IST).replace(hour=18,minute=0)
    scheduled=0
    def take_slot():
        nonlocal slot,scheduled
        current=slot
        slot += timedelta(minutes=MESSAGE_GAP_MINUTES)
        scheduled += 1
        return current
    date_label=quiz_date.strftime("%A, %d %B %Y")
    await client.send_message(peer,build_intro(date_label,count),parse_mode="html",
                              schedule=take_slot())
    for i,q in enumerate(selected):
        chunks=question_material(q,i,count)
        for part_no,chunk in enumerate(chunks,1):
            suffix=f"\n\n(Part {part_no}/{len(chunks)})" if len(chunks)>1 else ""
            await client.send_message(peer,chunk+suffix,schedule=take_slot())
            await asyncio.sleep(0.25)
        poll=types.Poll(
            id=random.getrandbits(63),
            hash=random.getrandbits(63),
            question=types.TextWithEntities(
                text=f"Q{i+1}/{count} — Select your answer (see question above)",
                entities=[]),
            answers=[types.InputPollAnswer(
                text=types.TextWithEntities(
                    text=f"{label}. {option}",entities=[]),media=None)
                for label,option in zip("ABCD",q["options"])],
            quiz=True)
        media=types.InputMediaPoll(poll=poll,correct_answers=[q["correct"]],
                                   solution=None,solution_entities=None)
        await client(functions.messages.SendMediaRequest(
            peer=peer,media=media,message="",
            random_id=random.getrandbits(63),
            schedule_date=int(take_slot().timestamp())))
        posted_ids.append(q["id"])
        save_state(posted_ids)
        await asyncio.sleep(0.25)
    await client.send_message(peer,build_outro(),parse_mode="html",schedule=take_slot())
    return scheduled,slot

async def main():
    api_id=int(os.environ["TELEGRAM_API_ID"])
    api_hash=os.environ["TELEGRAM_API_HASH"]
    session=os.environ["TELEGRAM_SESSION"]
    channel=os.environ["TELEGRAM_CHAT_ID"]
    count=int(os.getenv("DAILY_QUESTION_COUNT",str(DEFAULT_DAILY_QUESTION_COUNT)))
    target_quizzes=int(os.getenv("TARGET_QUIZZES_AHEAD",str(DEFAULT_TARGET_QUIZZES)))
    queue_limit=int(os.getenv("MAX_SCHEDULED_MESSAGES",str(DEFAULT_QUEUE_LIMIT)))
    test_mode=os.getenv("QUIZ_TEST_MODE","").lower() in {"1","true","yes"}
    if count<1 or target_quizzes<1 or queue_limit<1:
        raise RuntimeError("Question count, target quiz count and queue limit must be positive.")

    client=TelegramClient(StringSession(session),api_id,api_hash)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise RuntimeError("Telegram session is not authorised; regenerate TELEGRAM_SESSION.")
        peer=await client.get_entity(channel)

        if test_mode:
            test_poll=types.Poll(
                id=random.getrandbits(63),hash=random.getrandbits(63),
                question=types.TextWithEntities(
                    text="TEST ONLY — Which option is the correct answer?",entities=[]),
                answers=[types.PollAnswer(
                    text=types.TextWithEntities(text=label,entities=[]),option=os.urandom(4))
                    for label in ["Option A — incorrect","Option B — correct",
                                  "Option C — incorrect","Option D — incorrect"]],
                quiz=True)
            test_media=types.InputMediaPoll(poll=test_poll,correct_answers=[1],
                                            solution=None,solution_entities=None)
            test_time=datetime.now(IST)+timedelta(minutes=10)
            await client(functions.messages.SendMediaRequest(
                peer=peer,media=test_media,message="",
                random_id=random.getrandbits(63),
                schedule_date=int(test_time.timestamp())))
            print(f"TEST MODE: Telegram accepted one fixed quiz poll for {test_time.isoformat()}.")
            return

        history=await client(functions.messages.GetScheduledHistoryRequest(peer=peer,hash=0))
        queued=list(history.messages)
        now=datetime.now(IST)
        existing_quiz_dates=[]
        for message in queued:
            message_text=getattr(message,"message","") or ""
            if "DAILY QUIZ CHALLENGE" in message_text:
                message_date=getattr(message,"date",None)
                if message_date:
                    existing_quiz_dates.append(message_date.astimezone(IST).date())
        # One-time migration: remove quiz batches by their introduction and schedule window.
        # Do not depend on Telegram returning the closing-message text verbatim.
        force_refresh=os.getenv("REFRESH_LEGACY_QUIZ_QUEUE","false").lower() in {"1","true","yes"}
        if force_refresh:
            refresh_ids=[]
            ordered=sorted(queued,key=lambda m:getattr(m,"date",datetime.min.replace(tzinfo=IST)))
            for index,message in enumerate(ordered):
                message_text=getattr(message,"message","") or ""
                if "DAILY QUIZ CHALLENGE" not in message_text:
                    continue
                start=getattr(message,"date",None)
                if start is None:
                    continue
                start=start.astimezone(IST)
                # Quiz messages are scheduled one minute apart. A 30-minute window
                # safely covers all five questions, split text parts, polls and outro.
                for candidate in ordered[index:]:
                    candidate_date=getattr(candidate,"date",None)
                    if candidate_date is None:
                        continue
                    candidate_date=candidate_date.astimezone(IST)
                    if candidate is not message and candidate_date-start>timedelta(minutes=30):
                        break
                    if getattr(candidate,"id",None):
                        refresh_ids.append(candidate.id)
            refresh_ids=list(dict.fromkeys(refresh_ids))
            if refresh_ids:
                await client(functions.messages.DeleteScheduledMessagesRequest(peer=peer,id=refresh_ids))
                print(f"Migration removed {len(refresh_ids)} scheduled quiz messages; unrelated posts outside quiz windows were preserved.")
            else:
                print("Migration found no scheduled quiz introductions to replace.")
            history=await client(functions.messages.GetScheduledHistoryRequest(peer=peer,hash=0))
            queued=list(history.messages)
            existing_quiz_dates=[]
            for message in queued:
                message_text=getattr(message,"message","") or ""
                if "DAILY QUIZ CHALLENGE" in message_text:
                    message_date=getattr(message,"date",None)
                    if message_date:
                        existing_quiz_dates.append(message_date.astimezone(IST).date())
        existing_quizzes=len(existing_quiz_dates)
        available_slots=max(0,queue_limit-len(queued))
        quizzes_needed=max(0,target_quizzes-existing_quizzes)
        print(f"Telegram scheduled messages currently queued: {len(queued)}")
        print(f"Recognised upcoming daily quiz introductions: {existing_quizzes}")
        print(f"Target: {target_quizzes} quizzes ahead; available message slots: {available_slots}")

        if quizzes_needed==0:
            print("Queue is already at or above the advance-coverage target; nothing added.")
            return
        if available_slots==0:
            print("Telegram scheduled-message safety limit reached; nothing added.")
            return

        all_questions=load_questions()
        posted_ids=read_state()
        used_ids=set(posted_ids)
        start_date=next_start_date(existing_quiz_dates,now)
        added_quizzes=0
        total_added_messages=0
        for offset in range(quizzes_needed):
            selected=choose_questions(all_questions,used_ids,count)
            needed=quiz_message_count(selected)
            remaining_slots=available_slots-total_added_messages
            if needed>queue_limit or needed>remaining_slots:
                print(f"Skipping this quiz entirely: a complete {count}-question quiz needs "
                      f"{needed} scheduled messages, but only {remaining_slots} safe slots "
                      f"remain (queue ceiling {queue_limit}). No part of this quiz was scheduled.")
                break
            quiz_date=start_date+timedelta(days=offset)
            added,final_slot=await schedule_quiz(
                client,peer,selected,quiz_date,posted_ids)
            if added!=needed:
                raise RuntimeError(f"Quiz message-count mismatch: preflight expected {needed}, "
                                   f"but scheduler reported {added}.")
            added_quizzes+=1
            total_added_messages+=added
            print(f"Scheduled quiz {added_quizzes} for {quiz_date.isoformat()}: "
                  f"{added} Telegram messages; last item at {final_slot-timedelta(minutes=1):%H:%M} IST.")
        print(f"Queue top-up complete: {added_quizzes} quiz(zes), "
              f"{total_added_messages} messages added.")
        print(f"Scheduled queue now expected to contain {len(queued)+total_added_messages} "
              f"messages (safety ceiling {queue_limit}).")
    finally:
        await client.disconnect()

if __name__=="__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"ERROR: {exc}",file=sys.stderr)
        raise
