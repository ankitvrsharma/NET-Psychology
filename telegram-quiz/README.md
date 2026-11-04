# Telegram Daily UGC NET Psychology Quiz

Prepares the daily quiz and places the introduction, **5 native Telegram quiz polls**, and closing message into Telegram's server-side scheduled queue for publication from **18:00 IST**. GitHub runs at 17:35 IST to prepare the queue.

## Files

- `data/question_bank.xlsx` — source workbook (upload this file; do not rename it).
- `quiz_poster.py` — reads the workbook and posts quiz polls.
- `posted_ids.json` — remembers posted question IDs to avoid repeats.
- `../.github/workflows/telegram-daily-quiz.yml` — daily scheduler and manual test runner.

## One-time setup

### 1. Add the question bank

Create the folder `telegram-quiz/data/` in this repository and upload your existing workbook as:

`telegram-quiz/data/question_bank.xlsx`

The workbook must contain a worksheet named **Question Bank** and the columns used by your current question bank: **Exam Session**, **Paper**, **Q No.**, **Question / Instructions**, **Option A–D**, and **Correct Option**. List I, List II, and shared passage/context columns are included in the poll text when present. Legacy column names are also supported as fallbacks.

The script only posts rows with a stable session/paper/question identifier, four options, and an unambiguous answer key of A, B, C or D. It skips questions that exceed Telegram's poll limits (question 300 characters; each option 100 characters). It does not guess missing answers.

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

- Each successful run sends a formatted introduction, five independent Telegram quiz polls, and a closing comment/share prompt.
- Polls are numbered (01/05 to 05/05), and the date in the introduction uses India Standard Time.
- Telegram displays the correct option and answer text after a learner responds.
- Telegram marks the correct option and displays the configured answer explanation after a learner responds.
- The script uses only the answer key printed in the workbook. Missing or ambiguous answer keys are excluded.
- Question IDs are saved in `posted_ids.json`. The bank is recycled only when fewer than five unused eligible questions remain.
- If the workflow fails, inspect its log under **Actions**. Fix the cause and use **Run workflow** to retry.

## Important answer-key limitation

The source workbook's answer field is labelled “as printed in PDF”. This automation does not independently verify each answer against NTA's final answer key. Review answer keys before using the polls as authoritative exam guidance.


## Native Telegram scheduled queue (personal account)

The quiz publisher now uses Telegram MTProto through Telethon. It schedules the introduction, five quiz polls and closing message directly in the channel's Telegram scheduled queue. Your personal account must be an administrator of the channel with permission to post.

### One-time account setup

1. Open https://my.telegram.org while signed in with your Telegram account, choose **API development tools**, and create an application. Keep the API ID and API Hash private.
2. On a trusted computer (or Android with Termux and Python), install Telethon: `pip install Telethon==1.43.0`.
3. Run `python create_user_session.py` from this folder. Enter your API ID, API Hash and phone number. Complete Telegram's login code and 2-step verification if requested.
4. Add these GitHub Actions repository secrets under **Settings → Secrets and variables → Actions**:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
   - `TELEGRAM_SESSION` (the session string printed by the helper)
   - `TELEGRAM_CHAT_ID` (channel username such as `@yourchannel`, or its numeric ID)
5. Run **Schedule Daily Psychology Quiz in Telegram** manually once. Confirm the posts appear in the channel's Scheduled Messages list.

**Security:** A Telegram session string grants access to your account. Never send it to anyone, paste it into chat, commit it to Git, or expose it in workflow logs. Store it only as a private GitHub Actions secret. Revoke active sessions from Telegram Settings → Devices if it is ever exposed.

The workflow runs at 17:35 IST and schedules publication beginning at 18:00 IST, one item per minute. If the workflow runs too close to 18:00, the script moves the sequence to the next day to ensure Telegram has time to queue it.
