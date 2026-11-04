# Telegram Daily UGC NET Psychology Quiz

This automation maintains an advance queue of daily quizzes in Telegram's native Scheduled Messages. It targets seven upcoming daily quizzes, publishing each at **6:00 PM IST**. GitHub Actions runs daily at **5:35 PM IST** to replenish the queue.

## Each daily quiz

- A formatted introduction with the quiz date.
- Five exam-focused questions by default.
- Complete question stems, shared passages/case context, List I/List II content (when present), and all four full answer choices.
- One native Telegram quiz poll per question, using compact A/B/C/D choices.
- A closing message.

Long question material is split into readable, numbered text parts. The native quiz poll follows the final part. The correct option remains linked to the workbook answer key.

## Adaptive queue management

Every run reads Telegram's current Scheduled Messages queue before adding anything.

- **Advance target:** 7 daily quizzes.
- **Safety ceiling:** 80 scheduled messages in the channel.
- **Dynamic capacity:** The script calculates the actual message count for each quiz, including long-question parts, and schedules only complete quizzes that fit.
- **Daily replenishment:** The 5:35 PM IST workflow counts upcoming quiz introductions and tops the queue back up toward seven. After a quiz is published, the next run normally adds one quiz at the end.
- **Existing messages:** All scheduled messages in the channel count toward the safety ceiling, including messages not created by this automation.
- **No repeats:** Question IDs are saved in posted_ids.json. Questions are not repeated until the unused eligible question pool is exhausted.

If the next complete quiz will exceed the safe queue ceiling, the script stops without scheduling a partial quiz.

## Repository files

- data/question_bank.xlsx — source workbook (worksheet: **Question Bank**).
- schedule_quiz.py — adaptive Telegram queue scheduler.
- posted_ids.json — question IDs already scheduled, used to avoid repeats.
- create_user_session.py — Telethon session setup helper.
- ../.github/workflows/telegram-daily-quiz.yml — daily replenishment and manual trigger.

## Question bank requirements

The workbook should contain a worksheet named **Question Bank** and columns for **Exam Session**, **Paper**, **Q No.**, **Question / Instructions**, **Option A–D**, and **Correct Option**. Shared passage/context and List I/List II columns are included when present. Legacy column names are supported.

A row is eligible when it has a stable session/paper/question identifier, question content, four non-empty options, and an unambiguous answer key of A, B, C or D. Long question stems and answer choices are retained as text. Missing or ambiguous answer keys are skipped rather than guessed.

## Telegram account setup

The publisher uses Telegram MTProto through Telethon and your personal Telegram account. The account must be an administrator of the channel with permission to post.

1. Open https://my.telegram.org, choose **API development tools**, and create an application. Keep the API ID and API Hash private.
2. Install Telethon on a trusted computer (or Android with Termux and Python): pip install Telethon==1.43.0.
3. Run python create_user_session.py from this folder. Complete Telegram's login code and two-step verification if requested.
4. Add these GitHub Actions repository secrets under **Settings → Secrets and variables → Actions**:
   - TELEGRAM_API_ID
   - TELEGRAM_API_HASH
   - TELEGRAM_SESSION
   - TELEGRAM_CHAT_ID (channel username such as @yourchannel, or its numeric ID)

**Security:** A Telegram session string grants access to your account. Never send it in chat, commit it to Git, or expose it in workflow logs. Store it only as a private GitHub Actions secret. Revoke active sessions from Telegram Settings → Devices if it is ever exposed.

## Initial setup and operation

1. Confirm the workbook and all four GitHub secrets are present.
2. Open the repository's **Actions** tab.
3. Select **Maintain Advance Daily Psychology Quiz Queue**.
4. Select **Run workflow** once to build the initial advance queue.
5. Open the channel's **Scheduled Messages** and confirm the daily quiz introductions, text parts, polls and closing messages are queued on successive days at 6:00 PM IST.

After the initial run, the daily 5:35 PM IST workflow maintains the queue automatically. GitHub Actions may start late during platform load. If a run fails, inspect its log and Telegram's Scheduled Messages before retrying, because some messages may already have been queued.

## Answer-key limitation

The source workbook's answer field may reflect the answer printed in the source PDF. This automation does not independently verify every answer against NTA's final answer key. Review answer keys before treating polls as authoritative exam guidance.
