# Beginner maintenance guide

You do not need to learn web development to maintain the project.

## Content workflow

When you add a new Psychology source, use it to populate the relevant learning locations rather than repeating the same material everywhere. Keep:
- concise concept explanations in learning pages;
- retrieval prompts and application questions where they serve a different learning decision;
- source attribution/provenance with the content;
- PYQs in the practice system, with their session/source information preserved.

Learner progress belongs on the learner's device and must not be committed to GitHub.

## Main files

- `app.js` — application behaviour, learning flow and progress logic.
- `style.css` — responsive presentation.
- `data.json` — canonical syllabus/content data.
- `data.js` — generated browser bundle.
- `practice_questions.json` / `practice_explanations.json` — generated practice data.
- `scripts/build_practice.py` — practice-bank build and validation.
- `sw.js` — PWA caching.
- `manifest.webmanifest` — install metadata.

## Publishing content

The GitHub Actions workflow validates generated content; it does not push commits to `main` automatically. Generated files should be reviewed and committed deliberately.

## Quality checks

Before publishing:
1. validate JSON;
2. build the generated content bundles;
3. check internal links and page loading;
4. test keyboard navigation and mobile layouts;
5. confirm new source material is represented in the appropriate learning location;
6. review source/provenance and copyright-sensitive excerpts.

## Learner data

Progress, revision history and imported backups stay local to the learner. Do not place personal progress data in repository files.
