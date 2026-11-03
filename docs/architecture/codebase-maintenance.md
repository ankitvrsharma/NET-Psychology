# Codebase maintenance guide

## Scope

This repository is a static, GitHub Pages-hosted UGC NET Psychology learning application. The learner experience is implemented in browser JavaScript and static content files; remote account synchronisation is an optional service.

## Source-of-truth boundaries

| Concern | Canonical location | Responsibility |
|---|---|---|
| Syllabus taxonomy | `data/syllabus-index.json` | The ten-unit hierarchy and canonical micro-topic IDs |
| Learning content | `content/**` | Explanations, notes, recall prompts, question pools and practice packages |
| Content-pool registry | `content-pools/registry.json` | Pool paths, formats and supported capabilities |
| Browser entry point | `app.js` | Load configuration, optional account persistence and the shared runtime |
| Learner runtime | `app/runtime.js` | Page routing, learning interactions, progress and practice behaviour |
| Offline shell | `sw.js` | Explicitly allowlisted shell and public study-data caching |
| Page structure | Root `*.html` files | Semantic page shells and navigation landmarks |
| Shared presentation | `style.css` and page-specific stylesheets | Responsive layout and visual components |
| Automated checks | `scripts/` and `.github/workflows/` | Syntax, route, content-contract and regression validation |

## Code conventions

1. Use descriptive, lower-camel-case names for JavaScript functions and variables.
2. Use one responsibility per function where practical; keep shared behaviour in the shared runtime rather than copying it into individual pages.
3. Add comments to explain contracts, invariants, non-obvious decisions and browser constraints. Do not narrate self-explanatory statements.
4. Prefer early returns and explicit branches over deeply nested conditions.
5. Use semantic HTML, unique IDs, accessible names and keyboard-operable controls.
6. Keep content data separate from rendering and interaction logic.
7. Avoid duplicate allowlists, dead code, unused selectors and compatibility branches without a verified caller.
8. Do not remove error recovery that protects learner progress, offline use or local learning when optional services fail.

## Versioning

- `content-version.js` publishes the content version used by the browser.
- Script and stylesheet query versions are cache-busting identifiers; update them when the referenced asset changes and keep related page references consistent.
- `sw.js` uses a separate shell-cache version. Increment it whenever the precache shell changes.
- Do not use one version number as a substitute for another. Document the purpose of each version at its declaration.

## Learning invariants

Changes must preserve the approved learning sequence: Understand → Retrieve → Apply → Interleave → Space → Master.

The existing mastery gate and spaced-revision schedule are product rules, not implementation details. Do not alter them as part of refactoring. Local progress remains usable without remote authentication. Cached study content remains available when the network is unavailable, subject to the service worker's explicit cache policy.

## Change and release workflow

1. Create a focused branch from the current `main`.
2. Inspect all callers and related routes before changing shared functions or data contracts.
3. Add or update regression checks for changed behaviour.
4. Run JavaScript syntax checks, content validation and route-contract tests.
5. Review the complete pull-request diff for accidental content, design or learning-rule changes.
6. Merge only after explicit owner approval and successful required checks.
7. Verify the deployed GitHub Pages site and key flows after merge. CI success alone is not proof of visual, device or offline QA.

## Audit checklist

- [ ] All local links, script and stylesheet references resolve.
- [ ] Every app page declares a registered `data-page` route.
- [ ] Page IDs are unique and controls have accessible names.
- [ ] Navigation and page actions work by keyboard and touch.
- [ ] Learning, recall, application, revision and mastery state transitions remain consistent.
- [ ] MCQ and PYQ categories render independently and correctly.
- [ ] Progress calculations use consistent denominators.
- [ ] Content pools map to canonical syllabus IDs.
- [ ] Local progress and optional account synchronisation do not overwrite each other incorrectly.
- [ ] Service-worker cache rules exclude private/authentication data.
- [ ] Layouts work at phone, tablet, landscape and desktop widths.
- [ ] PWA install and offline behaviour are tested in a real browser.
