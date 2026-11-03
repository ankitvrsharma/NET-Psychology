#!/usr/bin/env python3
"""Post five UGC NET Psychology quiz polls from the existing Excel question bank."""
import json, os, random, sys, time, urllib.parse, urllib.request
from datetime import datetime
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent
BOOK = ROOT / "data" / "question_bank.xlsx"
STATE = ROOT / "posted_ids.json"
DAILY_COUNT = int(os.getenv("DAILY_QUESTION_COUNT", "3"))
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
API = f"https://api.telegram.org/bot{BOT_TOKEN}/"

def telegram(method, payload):
    body = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(API + method, data=body)
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # Telegram returns a JSON description (e.g. chat not found / not enough rights).
        details = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.dumps(json.loads(details), ensure_ascii=False)
        except ValueError:
            pass
        raise RuntimeError(
            f"Telegram rejected {method} (HTTP {exc.code}): {details}. "
            "Check TELEGRAM_CHAT_ID and make sure the bot is an administrator "
            "with permission to post in the channel."
        ) from exc
    if not result.get("ok"):
        raise RuntimeError(f"Telegram API error in {method}: {result}")
    return result["result"]

def load_questions():
    if not BOOK.exists():
        raise FileNotFoundError(
            f"Missing {BOOK}. Upload your workbook to telegram-quiz/data/question_bank.xlsx."
        )
    wb = load_workbook(BOOK, read_only=True, data_only=True)
    ws = wb["Question Bank"] if "Question Bank" in wb.sheetnames else wb.active
    rows = ws.iter_rows(values_only=True)
    headers = [str(v).strip() if v is not None else "" for v in next(rows)]
    records = []

    def cell(item, *names):
        for name in names:
            value = item.get(name)
            if value is not None and str(value).strip():
                return str(value).strip()
        return ""

    def answer_letter(value):
        value = str(value or "").strip().upper()
        # Accept only an unambiguous A/B/C/D key, including common printed forms.
        import re
        match = re.fullmatch(r"(?:OPTION\\s*)?([ABCD])(?:[.)])?", value)
        return match.group(1) if match else ""

    for row in rows:
        item = dict(zip(headers, row))
        question = cell(item, "Question / Instructions", "Question")
        list_one = cell(item, "List I — Items", "List I - Items", "List I")
        list_two = cell(item, "List II — Items", "List II - Items", "List II")
        passage = cell(item, "Shared Passage / Case Context", "Passage / Case Context")
        # Preserve all question context and matching-list material from the source workbook.
        parts = [part for part in [passage, question, list_one, list_two] if part]
        full_question = "\\n\\n".join(parts)
        options = [cell(item, f"Option {letter}") for letter in "ABCD"]
        answer = answer_letter(cell(item, "Correct Option", "Answer (as printed in PDF)", "Answer"))
        session = cell(item, "Exam Session", "Exam Cycle / Session")
        paper = cell(item, "Paper")
        qno = cell(item, "Q No.", "Question No.", "Question Number")
        # These source columns together form a stable ID; no workbook edits are needed.
        record_id = "|".join(x for x in [session, paper, qno] if x)

        if not record_id or not full_question or answer not in {"A", "B", "C", "D"}:
            continue
        if any(not option or len(option) > 100 for option in options):
            continue
        if len(full_question) > 300:
            continue

        records.append({
            "id": record_id,
            "question": full_question,
            "options": options,
            "correct": "ABCD".index(answer),
            "session": session,
            "paper": paper,
        })
    wb.close()
    if not records:
        raise RuntimeError(
            f"No eligible questions found in worksheet {ws.title!r}. "
            f"Detected columns: {headers!r}. "
            "Rows must have a question, four options, a Correct Option of A/B/C/D, "
            "and Exam Session, Paper and Q No. to identify the question."
        )
    print(f"Loaded {len(records)} eligible questions from {BOOK.name}.")
    return records

def read_state():
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return []

def save_state(ids):
    STATE.write_text(json.dumps(ids, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main():
    all_questions = load_questions()
    posted = read_state()
    unused = [q for q in all_questions if q["id"] not in set(posted)]
    if len(unused) < DAILY_COUNT:
        posted, unused = [], all_questions[:]
    if len(unused) < DAILY_COUNT:
        raise RuntimeError(f"Only {len(unused)} eligible questions; {DAILY_COUNT} required.")

    selected = random.SystemRandom().sample(unused, DAILY_COUNT)
    today = datetime.now().strftime("%d %B %Y")
    telegram("sendMessage", {
        "chat_id": CHAT_ID,
        "text": f"🧠 NET JRF PSYCHOLOGY\nDAILY QUIZ.",
        "disable_web_page_preview": "true",
    })
    for index, q in enumerate(selected, start=1):
        source = " · ".join(x for x in [q["session"], q["paper"]] if x)
        question_text = f"Q{index}. {q['question']}"
        if source:
            question_text += f"\n\n📚 {source}"
        if len(question_text) > 300:
            raise RuntimeError(f"Question {q['id']} exceeds Telegram's 300-character poll limit.")
        telegram("sendPoll", {
            "chat_id": CHAT_ID, "question": question_text,
            "options": json.dumps(q["options"], ensure_ascii=False),
            "type": "quiz", "correct_option_id": str(q["correct"]),
            "is_anonymous": "true",
            "explanation": f"Correct answer: {chr(65 + q['correct'])}. {q['options'][q['correct']]}",
        })
        posted.append(q["id"])
        save_state(posted)  # Persist after each successful poll, including partial-run recovery.
        time.sleep(1.2)
    print(f"Posted {len(selected)} quiz polls. Eligible bank: {len(all_questions)} questions.")
    print("Posted IDs:", ", ".join(q["id"] for q in selected))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
