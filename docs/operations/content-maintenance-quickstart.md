# Content maintenance quickstart

This guide is for maintaining the website from GitHub on a phone or laptop. You do not need to edit JavaScript for routine content work.

## The safe rule

**Prepare → review → validate → merge.** Never edit `main` directly for content changes. Work on a branch or let the Admin Workbench prepare a pull request. Merge only after GitHub Actions passes and you have inspected the diff.

## Where things belong

| If you want to… | Use |
| --- | --- |
| Change a unit/topic/micro-topic label or stable ID | `data/syllabus-index.json` — structural changes only |
| Improve the learner explanation | `content/microtopics/micro_topics.json` |
| Add deeper explanation and conceptual distinctions | `content/deep-dive/deep_dive.json` |
| Improve retrieval prompts and expected answers | `content/active-recall/active_recall.json` |
| Improve revision guidance | `content/revision/revision_guidance.json` |
| Add original topic-specific application questions | `content/practice/practice_mcqs.json` |
| Correct or add an authentic PYQ | `content/questions/questions.json` plus source/mapping metadata |
| Register a source and what it supports | `sources/source-register.json` |
| Add a new source file for the content pipeline | `sources/inbox/` |

The ten-unit outline and existing micro-topic IDs are stable by default. Do not renumber IDs to make a new topic fit. If the taxonomy truly needs a change, review all dependent pools and question mappings in the same PR.

## Standard content package

Use `docs/operations/micro-topic-authoring-template.md` for every new or substantially rewritten lesson. A lesson should be a natural learning chunk, not a forced word-count target. It should state its learning objective, explanation, important distinctions, an application, retrieval prompts, source evidence, and unresolved gaps. Add detailed sections only when they help a learner make a different decision.

Keep the content roles separate:
- authentic PYQs preserve their original question, options, answer, year and source;
- generated practice is clearly labelled as practice and includes a rationale;
- source-derived claims cite repository source and page/section when available;
- model synthesis or unresolved claims are flagged, not silently presented as source facts;
- expert-verified content is not rewritten automatically.

## Adding a source

1. Add the approved file under `sources/inbox/` using a clear filename.
2. Add an entry to `sources/source-register.json`: title, source type, scope, and known limitations. Do not paste extracted copyrighted book text into the register.
3. Run the Source intake workflow and review its artifact for unsupported files and page counts.
4. Prepare a narrowly scoped content packet for the affected unit/topic.
5. Verify source page references and complete PYQ wording/options/answer before marking the content verified.
6. Review the PR diff on the phone preview or laptop. Confirm unrelated topics and stable IDs are unchanged.

## What the checks mean

- **PASS** means the required fields/links exist; it does not prove that psychology facts are correct.
- **Needs source review** means source/page/answer verification is incomplete.
- **Needs content work** means one or more connected learning components are missing or too thin.
- **Expert verified** is a human review decision, not an AI score.

A content-health report is a triage list. Use it to choose what to fix next, not as proof that a lesson is scientifically accurate.

## Before merging

- [ ] GitHub Actions checks pass.
- [ ] Only the intended content/source/docs changed.
- [ ] Authentic PYQs are unchanged except explicitly permitted formatting/explanation edits.
- [ ] No expert-verified component was changed.
- [ ] Unit/topic/micro-topic IDs and question mappings are valid.
- [ ] No learner progress, bookmarks, or revision state is reset.
- [ ] Mobile and desktop learner routes still work.
- [ ] The live site is checked after merge.

## Recovery

Every merge is a commit. If a release breaks the website, use GitHub's **Revert** action on the offending commit/PR instead of manually trying to reconstruct deleted content. For learner data stored in Supabase or on devices, a code revert does not restore user data; avoid schema/data migrations unless separately planned and backed up.
