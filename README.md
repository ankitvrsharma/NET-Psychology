# UGC NET Psychology — Learning System

A simple, learning-first static website designed for GitHub Pages and PWA installation.

## Design principles implemented

- **Active retrieval:** the learner recalls before seeing an answer.
- **Elaboration:** every micro-topic moves from a short explanation to a core idea and application.
- **Contextual application:** learners use concepts in a situation rather than only rereading definitions.
- **Spaced revision:** revision dates are generated from retrieval performance.
- **Desirable difficulty:** confidence is recorded before answer reveal and practice is kept separate from explanation.
- **Mastery evidence:** mastery is not just completion; the system tracks learning, retrieval, application and practice evidence.
- **Small sessions:** one micro-topic is the basic learning unit to reduce cognitive overload.
- **Exam readiness:** coverage, retrieval, application and mastery are shown separately and combined only as a learning indicator.

## Approved learner structure

Home → Learn → Learning Session → Practice → Revision → Progress

A learning session follows:

**Understand → Retrieve → Apply → Practice → Schedule Revision**

The question area has only two learner-facing distinctions: **MCQ** and **PYQ**.

## Source basis for the current syllabus map

The 10-unit structure is based on the supplied `_NTA_UGC_NET_JRF_SLET_Psychology_Paper_2_Power_within_Psychology.pdf`. The source's contents section identifies Units 1–10 as Emergence of Psychology; Research Methodology and Statistics; Psychological Testing; Biological Basis of Behavior; Attention, Perception, Learning, Memory and Forgetting; Thinking, Intelligence, and Creativity; Personality, Motivation, Emotion, Stress and Coping; Social Psychology; Human Development and Interventions; and Emerging Areas.

Current micro-topic seeds are source-derived and intentionally concise. The remaining topics are mapped and ready for population from the supplied books and PYQ files.

## GitHub Pages deployment

1. Create a new GitHub repository.
2. Upload all files in this folder to the repository root.
3. In **Settings → Pages**, select **Deploy from a branch** and choose `main` / root, OR keep the included workflow if you prefer Actions deployment.
4. Open the Pages URL.
5. On a supported browser, use **Install app / Add to Home Screen** to install the PWA.

No npm or build step is required for this version.

## Updating content

- `content.js` contains learner-facing content in a single easy-to-edit file.
- `content/` is reserved for source notes, question banks and future generated content.
- `app.js` contains the learning/revision logic.
- `styles.css` contains visual design.

For normal maintenance, ask ChatGPT to update the repository ZIP; upload the replacement files to GitHub.

## Learner data

Progress is stored locally in the learner's browser. It is not stored in GitHub. This keeps learner data separate from website content.

## PYQ rule

Only actual PYQs supplied by the website owner should be presented as PYQs. Missing year/session/examination metadata must not be invented.
