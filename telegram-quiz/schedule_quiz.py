#!/usr/bin/env python3
"""Prepare the daily quiz and place it in Telegram's native scheduled queue."""
import asyncio, json, os, random, sys
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

def cell(row,*names):
    for name in names:
        value=row.get(name)
        if value is not None and str(value).strip(): return str(value).strip()
    return ""

def load_questions():
    import re
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
        if not rid or not question or not match or any(not x or len(x)>100 for x in options): continue
        if len(question)+len(source)+20>290: continue
        records.append({"id":rid,"question":question,"options":options,"correct":"ABCD".index(match.group(1)),"source":source})
    wb.close()
    if not records: raise RuntimeError(f"No eligible questions in {ws.title!r}; columns={headers!r}")
    return records

def read_state():
    try: return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError,ValueError): return []

def save_state(ids):
    STATE.write_text(json.dumps(ids,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

async def main():
    api_id=int(os.environ["TELEGRAM_API_ID"])
    api_hash=os.environ["TELEGRAM_API_HASH"]
    session=os.environ["TELEGRAM_SESSION"]
    channel=os.environ["TELEGRAM_CHAT_ID"]
    count=int(os.getenv("DAILY_QUESTION_COUNT","5"))
    hour=int(os.getenv("QUIZ_POST_HOUR_IST","18"))
    minute=int(os.getenv("QUIZ_POST_MINUTE_IST","0"))
    test_mode=os.getenv("QUIZ_TEST_MODE","").lower() in {"1","true","yes"}
    if not test_mode:
        questions=load_questions()
        posted=read_state()
        unused=[q for q in questions if q["id"] not in set(posted)]
        if len(unused)<count: posted=[]; unused=questions[:]
        if len(unused)<count: raise RuntimeError(f"Only {len(unused)} eligible questions; {count} required.")
        selected=random.SystemRandom().sample(unused,count)
    first=datetime.now(IST).replace(hour=hour,minute=minute,second=0,microsecond=0)
    if first<=datetime.now(IST)+timedelta(minutes=10): first+=timedelta(days=1)
    times=[first+timedelta(minutes=i) for i in range(count+2)]
    client=TelegramClient(StringSession(session),api_id,api_hash)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise RuntimeError("Telegram session is not authorised; regenerate TELEGRAM_SESSION.")
        peer=await client.get_entity(channel)

        # Isolated smoke test: one fixed, known-answer quiz poll. It does not
        # read or update the question bank/history and sends no intro/outro.
        if test_mode:
            test_poll=types.Poll(
                id=random.getrandbits(63),
                hash=random.getrandbits(63),
                question=types.TextWithEntities(
                    text="TEST ONLY — Which option is the correct answer?",
                    entities=[]),
                answers=[
                    types.PollAnswer(
                        text=types.TextWithEntities(text=label,entities=[]),
                        option=os.urandom(4))
                    for idx,label in enumerate(
                        ["Option A — incorrect","Option B — correct",
                         "Option C — incorrect","Option D — incorrect"])
                ],
                quiz=True)
            test_media=types.InputMediaPoll(
                poll=test_poll,correct_answers=[1],
                solution=None,solution_entities=None)
            test_time=datetime.now(IST)+timedelta(minutes=10)
            await client(functions.messages.SendMediaRequest(
                peer=peer,media=test_media,message="",
                random_id=random.getrandbits(63),
                schedule_date=int(test_time.timestamp())))
            print("TEST MODE: Telegram accepted one fixed quiz poll.")
            print(f"Test poll scheduled for {test_time.isoformat()}.")
            return

        date_label=first.strftime("%A, %d %B %Y")
        intro = """🧠 <b>NET JRF PSYCHOLOGY</b>
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
👇 <b>Your quiz starts below. All the best!</b>""".format(date_label=date_label, count=count)
        for i,q in enumerate(selected):
            source=f"\n\n📚 {q['source']}" if q["source"] else ""
            poll=types.Poll(
                id=random.getrandbits(63),
                hash=random.getrandbits(63),
                question=types.TextWithEntities(text=f"{i+1:02d}/{count:02d}  •  {q['question']}{source}",entities=[]),
                answers=[types.PollAnswer(text=types.TextWithEntities(text=opt,entities=[]),option=os.urandom(4)) for opt in q["options"]],
                quiz=True)
            # Omit optional solution text: Telethon requires solution and
            # solution_entities to be either both present or both absent.
            media=types.InputMediaPoll(poll=poll,correct_answers=[q["correct"]],
                solution=None,solution_entities=None)
            await client(functions.messages.SendMediaRequest(
                peer=peer,media=media,message="",random_id=random.getrandbits(63),
                schedule_date=int(times[i+1].timestamp())))
            posted.append(q["id"]); save_state(posted)
            await asyncio.sleep(1)
        # Queue the intro only after all polls have been accepted by Telegram.
        await client.send_message(peer,intro,parse_mode="html",schedule=times[0])
        outro=(
            "🏁 <b>YOU'VE COMPLETED TODAY'S QUIZ!</b>\n"
            "How many answers did you get right?\n\n"
            "💬 Share your score in the comments.\n"
            "🔁 Challenge a friend preparing for NET/JRF.\n"
            "<i>Consistency turns preparation into progress.</i>"
        )
        await client.send_message(peer,outro,parse_mode="html",schedule=times[-1])
        print(f"Added intro, {count} quiz polls and closing message to Telegram's scheduled queue.")
        print(f"First post: {times[0].isoformat()}")
    finally:
        await client.disconnect()

if __name__=="__main__":
    try: asyncio.run(main())
    except Exception as exc:
        print(f"ERROR: {exc}",file=sys.stderr); raise
