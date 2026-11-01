#!/usr/bin/env python3
"""Post five UGC NET Psychology quiz polls from the existing Excel question bank."""
import json
import os
import random
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent
BOOK = ROOT / "data" / "question_bank.xlsx"
STATE = ROOT / "posted_ids.json"
DAILY_COUNT = int(os.getenv("DAILY_QUESTION_COUNT", "5"))
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
API = f"https://api.telegram.org/bot{BOT_TOKEN}/"


def telegram(method, payload):
    body = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(API + method, data=body)
    with urllib.request.urlopen(request, timeout=40) as response:
        result = json.loads(response.read().decode("utf-8"))
    if not result.get("ok"):
        raise RuntimeError(f"Telegram API error in {method}: {result}")
    return result["result"]


def load_questions():
    if not BOOK.exists():
        raise FileNotFoundError(
            f"Missing {BOOK}. Upload your Excel question bank to "
            "telegram-quiz/data/question_bank.xlsx."
        )
    wb = load_workbook(BOOK, read_only=True, data_only=True)
    ws = wb["Question Bank"] if "Question Bank" in wb.sheetnames else wb.active
    rows = ws.iter_rows(values_only=True)
    headers = [str(v).strip() if v is not None else "" for v in next(rows)]
    records = []
    for row in rows:
        item = dict(zip(headers, row))
        question = str(item.get("Question") or "").strip()
        options = [str(item.get(f"Option {letter}") or "").strip()
                   for letter in "ABCD"]
        answer = str(item.get("Answer (as printed in PDF)") or "").strip().upper()
        record_id = str(item.get("Record ID") or "").strip()
        if not record_id or not question or answer not in "ABCD":
            continue
        if len(question) > 300 or any(not option or len(option) > 100 for option in options):
            continue
        if len(set(options)) < 2:
            continue
        records.append({
            "id": record_id,
            "question": question,
            "options": options,
            "correct": "ABCD".index(answer),
            "year": str(item.get("Year") or "").strip(),
            "session": str(item.get("Exam Cycle / Session") or "").strip(),
            "paper": str(item.get("Paper") or "").strip(),
            "number": str(item.get("Question Number") or "").strip(),
        })
    wb.close()
    if not records:
        raise RuntimeError("No usable questions found. Check the answer-key column and options.")
    return records


def read_state():
    if not STATE.exists():
        return []
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

    # Start a fresh cycle only after every eligible question has been used.
    if len(unused) < DAILY_COUNT:
        posted = []
        unused = all_questions[:]

    if len(unused) < DAILY_COUNT:
        raise RuntimeError(
            f"Only {len(unused)} eligible questions are available; "
            f"{DAILY_COUNT} are required each day."
        )

    selected = random.SystemRandom().sample(unused, DAILY_COUNT)
    today = datetime.now().strftime("%d %B %Y")
    telegram("sendMessage", {
        "chat_id": CHAT_ID,
        "text": f"🧠 UGC NET Psychology — Daily Quiz\n📅 {today}\n\nAnswer all {DAILY_COUNT} questions. Your result will be visible in each quiz poll. Good luck!",
        "disable_web_page_preview": "true",
    })

    for index, q in enumerate(selected, start=1):
        source = " · ".join(x for x in [q["session"], q["paper"]] if x)
        prefix = f"Q{index}/{DAILY_COUNT}"
        question_text = f"{prefix}. {q['question']}"
        if source:
            question_text += f"\n\nSource: {source}"
        payload = {
            "chat_id": CHAT_ID,
            "question": question_text,
            "options": json.dumps(q["options"], ensure_ascii=False),
            "type": "quiz",
            "correct_option_id": str(q["correct"]),
            "is_anonymous": "true",
            "explanation": (
                f"Correct answer: {chr(65 + q['correct'])}. "
                f"{q['options'][q['correct']]}"
            ),
        }
        telegram("sendPoll", payload)
        posted.append(q["id"])
        time.sleep(1.2)

    save_state(posted)
    print(f"Posted {len(selected)} quiz polls. Eligible bank: {len(all_questions)} questions.")
    print("Posted question IDs:", ", ".join(q["id"] for q in selected))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
