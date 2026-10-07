# UGC NET Psychology — Your Learning Guide

> **[🚀 Open the Website](https://ankitvrsharma.github.io/NET-Psychology/index.html)**

## What is this?

This is a focused study space for **UGC NET Psychology** learners.

It is built around the current **10-unit, 118-topic, 549-micro-topic** syllabus structure so that you can study Psychology in small, manageable learning units rather than trying to revise everything at once.

The goal is simple:

> **Understand → Recall → Practice → Schedule Revision**

You do not need to figure out what to study next from a long list of chapters. Start with a micro-topic, learn it, test yourself, and schedule your next return.

---

## How to use the website

### 1. Start with Learn

Open **Learn** and choose:

**Unit → Topic → Micro-topic**

A micro-topic is your basic study unit.

Instead of spending a long session passively reading, work through one focused micro-topic at a time.

---

### 2. Understand the concept

Each micro-topic is organised progressively:

- **Quick Learn** — a separate static quick-learning card on Home.
- **Core Learning** — build the main mental model.
- **Deep Dive** — connect, compare and extend the same concept.

Move deeper only when you need more detail.

This helps you avoid spending the same amount of time on every concept.

---

### 3. Recall from memory

After learning, **close the notes and reconstruct the idea yourself**.

You will get retrieval prompts such as:

- What is the concept?
- What are its important features?
- How is it different from a related concept?
- How would you explain it without looking at the notes?

Writing an answer from memory is more useful for learning than simply rereading the page.

You can also record your confidence as:

**Low · Medium · High**

---

### 4. Apply what you learned

Psychology is not only about remembering definitions.

The application step asks you to use the concept in a new situation or explain how you would identify it in a scenario.

This helps you move from:

**“I have read this.”**

to:

**“I can use this.”**

---

### 5. Practice with MCQs

After learning and retrieval, practise questions.

Answer **before** looking at the explanation.

The site distinguishes between:

- **MCQ** — practice questions prepared for learning.
- **PYQ** — actual previous-year questions when source information is available.

A generated practice question is never presented as an actual PYQ.

When you make an error, use it as information about what needs another round of learning or revision.

---

## Revision: come back at the right time

Learning something once is not the same as retaining it.

Use **Schedule Revision** after a learning or practice session.

You can rate your retrieval:

| Rating | What it means |
|---|---|
| **Again** | I could not recall it successfully. |
| **Hard** | I recalled it, but it required substantial effort. |
| **Good** | I recalled it successfully with normal effort. |
| **Easy** | I recalled it easily. |

Your next revision is then scheduled from your performance.

The aim is not to punish forgetting. If something is forgotten, return to it earlier and strengthen it.

---

## Your learning status

Your progress moves through five learning stages:

**STARTED → LEARNED → ACTIVELY RECALLED → REVISION → MASTERED**

Mastery is more than finishing a page.

Mastery is not awarded merely for opening a page. The system tracks understanding, active recall and spaced revision before a concept can become mastered.

So a completed micro-topic is not automatically a mastered micro-topic.

---

## What you can study

The website follows the current 10-unit UGC NET Psychology structure:

1. **Emergence of Psychology**
2. **Research Methodology and Statistics**
3. **Psychological Testing**
4. **Biological Basis of Behavior**
5. **Attention, Perception, Learning, Memory and Forgetting**
6. **Thinking, Intelligence, and Creativity**
7. **Personality, Motivation, Emotion, Stress and Coping**
8. **Social Psychology**
9. **Human Development and Interventions**
10. **Emerging Areas**

Each unit is divided into topics and then into the current **549 micro-topics**.

---

## A simple study session

When you sit down to study, follow this sequence:

**Choose one micro-topic**  
↓  
**Understand**  
↓  
**Recall**  
↓  
**Practice**  
↓  
**Schedule Revision**  
↓  
**Return later**

You do not need to finish an entire unit in one sitting.

A small completed learning cycle is better than a long passive reading session.

---

## What the source material means

The learning material is organised around the supplied UGC NET syllabus source and the accompanying Psychology study books.

The website uses these sources as a **study base and synthesis library**. The notes are intended to help you learn the concepts; they are not presented as verbatim reproductions of the books.

Actual PYQs are kept separate from generated practice material and are included only when their source information is available.

---

## Your data

Your learning progress is stored **locally in your browser**.

Your personal learning progress is separate from the website's syllabus and study content.

---

## Start here

If you are beginning from scratch:

**Home → Start Learning → Choose a micro-topic → Understand → Recall → Apply → Practice → Schedule Revision**

If you are returning after a gap:

**Continue from the micro-topic you were studying and check what is due for revision.**

The objective is not to make you spend more time on the website.

The objective is to help you **learn Psychology, retain it, and recall it when you need it for UGC NET.**

## Content audit and publication architecture

The content system has one authoritative source: the **published static content pools in the GitHub repository**.

The lifecycle is:

**Create or rewrite → AI audit → rewrite #1 if needed → re-audit → rewrite #2 if needed → final re-audit → static content pool**

- Content that passes the final AI audit is published **surgically by canonical content ID** into the relevant static pool.
- Content that still fails after the two rewrite attempts is withheld and placed in the owner approval queue.
- The Admin Workbench audits the **static pools directly**. It does not audit a Supabase copy.
- Supabase is a **derived synchronized copy** of the static pools. Synchronization upserts canonical records and removes stale database records that no longer exist in the static pools.
- Supabase must never become the authoring, audit, or canonical content source.

This keeps the learner-facing content, owner audit surface, and synchronized database aligned around one canonical version.

## Accounts and saved learning state

You can optionally create a learner account. When signed in, the site's learning state is backed up to Supabase so progress, revision state, practice history and bookmarks can follow you across devices. You can still browse without an account.

The administrator area uses a separate Supabase role. The owner account must be promoted to the `admin` role in Supabase SQL after the first account is created. Repository-writing actions in the content audit workbench go through the protected Supabase `admin-github-write` Edge Function. The GitHub credential is stored only as the Edge Function secret `GITHUB_ADMIN_TOKEN`; it is never exposed to learners or browser JavaScript.

### Supabase setup

Run `supabase/schema.sql` in the Supabase SQL Editor. Create your owner account at `login.html`, then promote that account once with the SQL statement documented at the bottom of the schema. Never put a Supabase secret/service-role key in the website.


### Admin bridge setup

If the Admin Workbench reports that the secure GitHub bridge cannot be reached, the learner-facing site is not broken. The one-time server setup is:

1. Deploy `supabase/functions/admin-github-write/index.ts` to the configured Supabase project.
2. Add the production Edge Function secret `GITHUB_ADMIN_TOKEN`.
3. Give that GitHub credential access to repository contents and workflow dispatches as required by the workbench.
4. Sign in with the Supabase account whose `profiles.role` is `admin`.
5. Open **Admin** again and use **Retry connection**.

The browser must be opened over HTTPS on the GitHub Pages site. The application redirects accidental HTTP page loads to HTTPS while preserving HTTP for local development.

