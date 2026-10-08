# NET Psychology — Maintenance & operations guide

This repository is a static learner application for UGC NET Psychology. Learner pages consume pre-built static data; generation, auditing and publication happen outside the learner runtime.

## 1. What must remain stable

The learner architecture is intentionally built around one connected package:

- **Understand — Micro-topic:** canonical knowledge.
- **Expand — Deep Dive:** source-supported depth and distinctions.
- **Retrieve — Active Recall:** retrieval of knowledge already taught.
- **Reinforce — Revision:** spaced strengthening of the same knowledge.
- **Apply — Practice:** original topic-specific application/discrimination.
- **Quick Learn / Daily Learning:** supplemental learner experiences.
- **Progress:** Started → Learned → Actively Recalled → Revision → Mastered.

Do not merge these into one generic content object or silently remove one of these learning paths.

## 2. Where learner content lives

- `data/syllabus-index.json` — canonical UGC NET Psychology taxonomy and micro-topic IDs.
- `content/microtopics/micro_topics.json` — canonical learner explanations.
- `content/deep-dive/deep_dive.json` — Deep Dive explanations.
- `content/active-recall/active_recall.json` — retrieval prompts and answers.
- `content/revision/revision_guidance.json` — revision guidance.
- `content/practice/practice_mcqs.json` — package-specific original application/discrimination MCQs.
- `content/questions/questions.json` — authentic PYQs and the general question bank.
- `content/quick-learn/quick_cards.json` — supplemental Quick Learn cards.
- `content/home/home-learning.json` — supplemental Home learning configuration.

**Important:** Home must not manufacture Quick Learn knowledge from micro-topics. Quick Learn content comes from its own JSON pool.

## 3. Daily Learning

Keep `daily3.html` and `daily-practice.html`.

Daily Learning intentionally provides:
1. three concepts selected for the learner;
2. a separate 10-question daily test.

These are supplemental learning paths, not replacements for the canonical five-function package.

## 4. Source intake

Put approved source material in `sources/inbox/`.

The source pipeline extracts and maps evidence to canonical micro-topics, generates a connected five-component package, audits each component, and publishes only the components that pass.

The learner browser never calls Gemini and never performs content repair.

## 5. Connected five-component content workflow

A source-backed rewrite is always generated as one connected package:

**Understand → Expand → Retrieve → Reinforce → Apply**

The newer Python connected-package audit is the authoritative AI audit. The retired browser heuristic audit is not part of the Admin Workbench.

- Expert-verified components are locked before generation and restored/checked after every rewrite.
- A component may be rewritten only when it is not **EXPERT VERIFIED**.
- Passing components are published surgically by canonical micro-topic ID.
- Failed components remain in the owner approval queue after the permitted rewrite attempts.
- `AI REVIEWED` and `EXPERT VERIFIED` are review states; they are never learner-facing learning content.

Learners never see internal audit scores, failure reasons or approval state.

## 6. Learner feedback

Learner feedback is collected separately from learner content.

Feedback is useful for future AI-assisted creation/rewrite decisions, but it must not modify content in the browser. Aggregation and interpretation belong in the content pipeline.

## 7. Verification metadata

`data/verification-state.json` is learner-facing metadata, not an audit report.

Allowed learner labels:

- **EXPERT VERIFIED**
- **VERIFIED**
- no tag

Do not expose internal audit files to learner pages.

## 8. Validation before merging

At minimum:

1. JSON files parse.
2. Canonical pool IDs and titles match the syllabus.
3. Practice packages use canonical IDs and `P` component IDs.
4. Questions have valid options, answers and explanations.
5. JavaScript compiles.
6. No learner page loads `content-audit.json`.
7. No deleted source-synthesis pool is referenced.
8. PWA cache contains only active learner routes/assets.
9. Progress fields remain compatible with existing localStorage data.
10. Responsive layout is preserved for phone, tablet and laptop.

## 9. PWA and cache changes

`sw.js` is responsible only for offline shell/data caching.

When a learner route or content file is retired, remove it from the cache inventory and increment the shell cache version. Never leave obsolete audit state in the learner cache.

## 10. Admin workbench

- `admin.html` + `admin.js` are owner-only tools.
- `app/content-audit.js` remains an admin-side deterministic audit helper.
- It must not be loaded by learner pages.
- Owner approval uses the content approval queue.
- Verification labels are stored separately from audit diagnostics.

## 11. Source files vs website assets

Source/reference documents belong under `sources/`, especially `sources/inbox/`.

Do not add reference PDFs to the learner shell or PWA cache.

## 12. Git workflow

For normal product changes:

1. Audit the current implementation.
2. Create a focused branch.
3. Make the smallest root-cause change.
4. Validate affected files.
5. Open a PR with a concise change summary and regression checks.
6. Obtain explicit merge approval.
7. Merge the PR.
8. Verify the merge commit and available CI/workflow status.

Never claim a live browser/device test unless one was actually performed.

## 13. Documentation synchronization

The architecture contract is generated from `content-pools/registry.json` into `docs/architecture/content-architecture.md`.

Run `python scripts/sync_documentation.py --write` after an architecture-contract change. CI runs the same generator in check mode, so a drifted architecture document cannot pass validation silently.

Keep `data/syllabus-index.json` as the only canonical taxonomy/index source. Do not recreate deleted parallel content indexes.

## 14. Versioning

Use SemVer only:

- patch: `1.0.x`
- minor: `1.x.0`
- major: `x.0.0`

Keep filenames stable. Cache/content versions must move deliberately with the release.

## 15. Troubleshooting

### A page says it cannot be rendered
Check:
- browser console for JavaScript syntax/runtime errors;
- `content-version.js`;
- `sw.js` cache version;
- the page's `data-page`;
- the route renderer in `app/runtime.js`;
- the required static JSON pool.

Do not immediately rewrite the page. Identify the first failing dependency.

### Content is missing
Check the relevant static pool and then `data/syllabus-index.json`. Do not add a second content source just to make one page work.

### Verification tag is missing
Check `data/verification-state.json`. Do not load internal audit state into the learner page.

### Old content appears offline
Increment the PWA shell cache version and remove obsolete assets from `sw.js`.

## 16. What not to do

- Do not reintroduce runtime content generation.
- Do not create a second canonical explanation for the same micro-topic.
- Do not turn Quick Learn into a derived runtime card.
- Do not remove Daily Learning or its 10-question test without an explicit product decision.
- Do not label generated practice as PYQ.
- Do not add generic AI filler to compensate for missing source evidence.
- Do not change working revision scheduling without evidence of a defect.
- Do not fix unrelated files merely because they look old.

The guiding rule is: **preserve working learner behaviour, change the smallest root cause, and keep the content architecture understandable enough that a future maintainer can safely modify it.**
