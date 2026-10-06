# Beginner maintenance guide

You do not need to learn web development to maintain the project.

## Core architecture

The learner website uses **pre-populated static content pools**.

The authoritative learner content is:

- `data/syllabus-index.json` — canonical unit/topic/micro-topic structure and IDs.
- `content/microtopics/micro_topics.json` — core micro-topic learning content.
- `content/quick-learn/quick_cards.json` — Quick Learn content.
- `content/deep-dive/deep_dive.json` — Deep Learning content.
- `content/active-recall/active_recall.json` — retrieval-practice content.
- `content/questions/questions.json` — MCQs and PYQs.
- `content/revision/revision_guidance.json` — revision guidance.
- `content/home/home-learning.json` — Home learning guidance.

The learner runtime **reads these pools directly**. It must not regenerate, hydrate, repair, audit or synchronise content while a learner is opening a page.

Do not reintroduce a second canonical content file such as the old `data.json`/generated `data.js` architecture.

## Main application files

- `app/runtime.js` — learner application behaviour, navigation, learning flow and local progress.
- `app.js` — runtime entry point.
- `style.css` — responsive presentation.
- `sw.js` — PWA/offline caching only.
- `manifest.webmanifest` — install metadata.
- `admin.js` / `admin.html` — owner audit workbench.
- `app/content-audit.js` — deterministic content-quality audit used by the admin layer.
- `content-audit.json` — owner review state.
- `content-pools/pool-integrity.js` — build/admin integrity helper.

## Content workflow

When a new Psychology source is added, use it to improve or create relevant content rather than repeating the same material everywhere. Keep:

- concise concept explanations in learning pages;
- retrieval prompts and application questions where they serve a different learning decision;
- source attribution/provenance with the content;
- PYQs in the question pool, with session/source information preserved.

New content should pass the same audit and pool-integrity checks before becoming part of the published learner pools.

Learner progress belongs on the learner's device and must not be committed to GitHub.

## Publishing validation

The GitHub Actions content-validation workflow checks the **published static pools directly**. It verifies:

1. the syllabus structure is valid;
2. each learning pool has the same canonical micro-topic coverage;
3. titles remain aligned with the syllabus;
4. questions have four options, valid answer indexes and valid syllabus mappings;
5. question explanations are present.

The workflow is a validation gate. It does not silently rewrite learner content.

## Source intake

`sources/inbox/` is for source files and provenance. `scripts/source_intake.py` inventories source files and checks their metadata; it is not itself a learner-content generator.

Source-derived content should be deliberately created, audited and published into the static pools.

## PWA and caching

Keep the service worker simple:

- cache the application shell;
- cache published static pools after successful network responses;
- use network-first behaviour so a new deployment can replace stale content;
- do not put content-generation or synchronisation logic into the service worker.

When changing the published pool set or runtime cache contract, bump the service-worker cache name.

## Quality checks before publishing

Before merging content or structural changes:

1. validate the JSON;
2. run the published-pool validation workflow;
3. check internal links and page loading;
4. test keyboard navigation and mobile/tablet layouts;
5. confirm new source material is represented in the appropriate learning location;
6. review source/provenance and copyright-sensitive excerpts;
7. verify the learner runtime is still reading the intended static pool directly.

## Learner data

Progress, revision history and imported backups stay local to the learner. Do not place personal progress data in repository files.
