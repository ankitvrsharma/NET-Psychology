# Contributing to the UGC NET Psychology Study Hub

Thank you for helping improve the project.

## Content standards

When adding academic material, identify which category it belongs to:

- **Official syllabus** — directly derived from the authoritative syllabus source.
- **Verified PYQ** — a previous-year question checked against the original paper or a traceable authoritative reproduction.
- **Study aid** — notes, examples, explanations, generated MCQs, or flashcards created for learning.
- **Personal note** — user-added material that has not been independently verified.

Do not label generated questions as official PYQs without verification.

## Code changes

Before committing:

1. Test the homepage.
2. Test at least one unit and topic page.
3. Test MCQ practice.
4. Test flashcards and bookmarks.
5. Test JSON export/import.
6. Check the layout on phone and tablet widths.
7. If PWA files changed, test the manifest and service worker.

## Data changes

When editing `data.json`:

- Preserve the 10-unit syllabus hierarchy.
- Avoid silently changing the wording of source-derived syllabus points.
- Keep generated material distinguishable from verified source material.
- Avoid inventing PYQ years, sessions, or sources.

## Pull requests / proposed changes

A useful change description should state:

- What changed
- Why it changed
- Which files were changed
- How it was tested
- Whether the change affects stored user data or the service worker
