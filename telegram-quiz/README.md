# Telegram Daily UGC NET Psychology Quiz

Posts **5 quiz polls every day at 08:00 IST** to your Telegram channel, using the existing Excel question bank.

## Files

- `data/question_bank.xlsx` — source workbook (upload this file; do not rename it).
- `quiz_poster.py` — reads the workbook and posts quiz polls.
- `posted_ids.json` — remembers posted question IDs to avoid repeats.
- `../.github/workflows/telegram-daily-quiz.yml` — daily scheduler and manual test runner.

## One-time setup

### 1. Add the question bank

Create the folder `telegram-quiz/data/` in this repository and upload your existing workbook as:

`telegram-quiz/data/question_bank.xlsx`

The workbook must contain a worksheet named **Question Bank** and these columns:

- Record ID
- Question
- Option A, Option B, Option C, Option D
- Answer (as printed in PDF)

The script only posts rows with a non-empty Record ID, four options, and an answer key of A, B, C or D. It skips questions that exceed Telegram's poll limits (question 300 characters; each option 100 characters). It does not guess missing answers.

### 2. Create a Telegram bot

1. Open Telegram and chat with **@BotFather**.
2. Send `/newbot` and follow the prompts.
3. Copy the bot token. Keep it private.
4. Add the bot to your Telegram channel as an **administrator** with permission to post messages.

### 3. Find the channel chat ID

For a public channel, the channel username can usually be used as the chat ID, for example `@your_channel`.

For a private channel, obtain its numeric chat ID (often a negative number beginning with `-100`) using a Telegram bot/API method after adding the bot. Do not publish this ID if you want to keep the channel private.

### 4. Add GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions → New repository secret**.

Create these two secrets:

- `TELEGRAM_BOT_TOKEN` — token from BotFather.
- `TELEGRAM_CHAT_ID` — channel username or numeric chat ID.

Never paste the bot token into source code, issues, or chat messages.

### 5. Enable and test

1. Open **Actions** in the GitHub repository.
2. If prompted, enable workflows.
3. Open **Telegram Daily Psychology Quiz**.
4. Select **Run workflow** to test a post immediately.
5. Confirm that the five quiz polls appear in your channel.

The scheduled run is at **12:30 UTC**, which is **18:00 IST**. GitHub Actions scheduled workflows can start a little later than the exact minute during periods of platform load.

## Posting and repeat rules

- Five independent Telegram quiz polls are sent per successful run.
- Telegram marks the correct option and displays the configured answer explanation after a learner responds.
- The script uses only the answer key printed in the workbook. Missing or ambiguous answer keys are excluded.
- Question IDs are saved in `posted_ids.json`. The bank is recycled only when fewer than five unused eligible questions remain.
- If the workflow fails, inspect its log under **Actions**. Fix the cause and use **Run workflow** to retry.

## Important answer-key limitation

The source workbook's answer field is labelled “as printed in PDF”. This automation does not independently verify each answer against NTA's final answer key. Review answer keys before using the polls as authoritative exam guidance.
