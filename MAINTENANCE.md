# Beginner maintenance guide

The website is a static learner application. The learner runtime reads pre-built content directly; content generation never runs in a learner's browser.

## Canonical learner content

- `data/syllabus-index.json` — canonical unit/topic/micro-topic IDs.
- `content/microtopics/micro_topics.json` — core micro-topic learning content.
- `content/quick-learn/quick_cards.json` — Quick Learn cards.
- `content/deep-dive/deep_dive.json` — deeper explanations.
- `content/active-recall/active_recall.json` — retrieval practice.
- `content/questions/questions.json` — MCQs and PYQs.
- `content/revision/revision_guidance.json` — revision guidance.

Do not reintroduce runtime hydration, synchronisation, repair or a second canonical content file.

## Automatic source-to-content pipeline

Put new source files in `sources/inbox/` and commit them to GitHub. The **Source to content automation** workflow then:

1. extracts text;
2. maps source evidence to canonical micro-topics;
3. creates source-grounded learner content;
4. repairs stale Quick Learn references and unresolved question mappings when confidence is high;
5. records provenance;
6. validates the static pools;
7. opens a review PR instead of publishing directly to `main`.

The learner site never performs these operations.

The workflow uses the Google Gemini API with structured JSON output. The repository needs an Actions secret named `GEMINI_API_KEY`; never put the key in source files. The default model is `gemini-2.5-flash`; a different Gemini model may be supplied as the Actions variable `NET_CONTENT_MODEL`.

For the first repair pass on the existing repository, run the workflow manually with **Repair existing = true** and **Synthesize sources = false**. After that, adding a new source can trigger the full source-to-content flow automatically.

## Content quality rules

Automation may classify and draft, but it must not silently decide uncertain mappings. High-confidence mapping is applied; ambiguous records remain reported for human review.

Source-derived content must:
- preserve source-supported terminology and named theories/researchers;
- distinguish source evidence from inference;
- avoid unsupported generic filler;
- use different wording for explanation, retrieval and revision decisions;
- retain PYQ provenance;
- avoid reproducing long copyrighted passages.

## Validation and publishing

Before merging content:
1. JSON and pool validation must pass;
2. unresolved mappings should be reviewed;
3. source provenance should be present;
4. learner page references must still resolve;
5. mobile/tablet/laptop behaviour should be checked for UI changes.

## Main application files

- `app/runtime.js` — learner behaviour and learning flow.
- `app.js` — runtime entry point.
- `style.css` — responsive presentation.
- `sw.js` — PWA/offline caching only.
- `admin.js` / `admin.html` — owner audit workbench.
- `app/content-audit.js` — deterministic content-quality audit for owner/admin use.

## Learner data

Progress, revision history and imported backups stay on the learner's device. Do not put personal learner progress into repository files.
