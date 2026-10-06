# NET-Psychology — Website Governance

> Single source of truth for agreed product philosophy, learning principles, UX rules, architecture boundaries, content rules, naming conventions, and change-management rules.
>
> This document records decisions made for the NET-Psychology website so they are not repeatedly rediscovered or accidentally reversed.

## 1. Product purpose

NET-Psychology is a learner-first UGC NET Psychology preparation system for NET and NET-JRF.

It is not intended to be:
- a PDF archive;
- a generic Psychology encyclopedia;
- a collection of disconnected AI notes;
- a feature showcase.

Its purpose is to help a learner understand Psychology, retrieve it, apply it, retain it, and become exam-ready.

The product principle is:

Understand → Retrieve → Apply → Interleave → Space → Master

The interface, content model, progress model, practice system, and revision system should reinforce this sequence.

## 2. Product philosophy

### 2.1 Learning is the product

Features are valuable only when they improve learning or make the learning system easier to use.

Before adding or changing something, ask:
1. What learner problem does this solve?
2. Which part of the learning cycle does it support?
3. Does it reduce or increase cognitive load?
4. Does it duplicate an existing capability?
5. Can the current architecture support it without creating a second system?

### 2.2 Learner decision first

Every screen should make the learner's next useful decision clear.

Examples:
- What should I learn?
- What should I recall?
- What should I practise?
- What should I revise?
- What should I do next?

Do not display information simply because it is available.

### 2.3 Don't fix what is not broken

This is a permanent engineering and product rule.

- Do not change working behaviour without a concrete reason.
- Do not refactor stable code merely for aesthetic preference.
- Do not replace a working architecture with a different architecture without a demonstrated need.
- Do not add speculative abstractions.
- Do not perform unrelated cleanup inside a feature or bug-fix PR.
- When something is broken, identify the smallest root cause and make the smallest safe correction.

Working code is not technical debt merely because it could be written differently.

### 2.4 Consistency beats novelty

Prefer one clear, predictable pattern over multiple clever alternatives.

Use:
- consistent terminology;
- consistent navigation;
- consistent button behaviour;
- consistent progress semantics;
- consistent content hierarchy;
- consistent responsive behaviour.

## 3. Learning architecture

### 3.1 The learning cycle

The system represents a complete learning cycle:

1. Understand — construct a coherent mental model.
2. Retrieve — recall without relying on the notes.
3. Apply — use the concept in questions or situations.
4. Interleave — distinguish related concepts and switch between them.
5. Space — return after time has passed.
6. Master — demonstrate stable learning rather than merely completing a page.

These are complementary stages, not six separate features.

### 3.2 Micro-topics are the atomic learning unit

The syllabus hierarchy is:

Unit → Topic → Micro-topic

A micro-topic should represent one coherent learnable concept.

It should be:
- focused;
- conceptually meaningful;
- exam-relevant;
- sufficiently explained;
- connected to related ideas where useful;
- suitable for later retrieval and revision.

Do not turn a micro-topic into a miniature textbook.

### 3.3 One canonical micro-topic experience

The approved runtime sequence is:

Concept Explanation → Deep Dive → Check Your Recall → Next

This is the canonical micro-topic learner flow.

Do not restore separate runtime experiences for:
- Short Notes;
- Detailed Explanation;
- alternate explanation cards;
- parallel explanation engines;
- source-specific learning pages.

If additional source material improves a concept, enrich the canonical content used by the existing flow.

### 3.4 Application and practice are part of the wider cycle

The micro-topic page does not need to contain every learning activity.

Understand and Deep Dive primarily support understanding.

Check Your Recall supports retrieval.

Practice / MCQs / PYQs support application, discrimination, and exam practice.

Revision supports spaced return.

This separation keeps each screen focused while preserving the complete learning cycle.

### 3.5 Mastery is earned

Opening a page, scrolling through content, or finishing a reading section does not equal mastery.

The approved mastery model requires:

Understanding → Active Recall → two revision cycles → MASTERED

Mastery should therefore represent evidence of learning, not page completion.

## 4. Retrieval, practice and revision principles

### 4.1 Retrieval before rereading

When the learner is asked to recall, the system should encourage an attempt from memory before revealing or revisiting the answer.

Do not design retrieval as another form of passive reading.

### 4.2 Practice has a learning purpose

Questions are not only for scoring.

An error should help the learner identify what needs:
- clarification;
- retrieval practice;
- comparison with a similar concept;
- further application;
- revision.

### 4.3 MCQ and PYQ remain distinct

The site should distinguish:
- MCQ — practice questions created for learning.
- PYQ — genuine previous-year questions supported by source information.

Generated questions must never be presented as PYQs.

Do not create a separate learner-facing Verified PYQ architecture when the approved system uses the MCQ/PYQ distinction.

### 4.4 Spacing is a learning mechanism

Revision should bring concepts back after a delay rather than encouraging endless immediate rereading.

The existing revision/progress model should be preserved unless a specific problem requires a change.

If a learner forgets something, the system should treat that as useful learning information and bring the concept back appropriately—not as failure.

### 4.5 Do not duplicate learning surfaces

The same explanation should not be copied into several cards or pages just because multiple locations are technically available.

Repeat information only when the repetition serves a different cognitive task.

## 5. Content philosophy

### 5.1 Sources are inputs; canonical content is the product

Uploaded books, PDFs, PYQs, notes, and other approved sources are used to produce learner-ready content.

The learner should consume the canonical content, not a collection of source-specific versions of the same concept.

### 5.2 New sources should enrich existing learning

When a new source is added:
1. identify what genuinely useful knowledge it contributes;
2. map it to the appropriate Unit → Topic → Micro-topic;
3. improve the existing canonical content where appropriate;
4. add distinctions, examples, explanations, or exam relevance only where they improve learning;
5. avoid duplicating material already adequately covered.

A new source should increase content quality, not merely content volume.

### 5.3 Source synthesis is not a learner-facing architecture

Multiple sources may be synthesized during content production.

However, source synthesis must not become a second runtime learning system.

The current architecture intentionally uses:
- canonical published content pools;
- source-aware content generation and repair;
- provenance/audit information where needed.

Do not recreate a source-synthesis runtime layer.

### 5.4 Source fidelity

Source-derived content should preserve the supported terminology, distinctions, theories, researchers, examples, and framing.

Do not silently invent claims or attribute unsupported information to a source.

## 6. Current architecture boundaries

The following architectural boundaries are intentional.

### 6.1 Syllabus is the structural source

data/syllabus-index.json provides the Unit → Topic → Micro-topic structure used by the runtime.

Do not create another competing syllabus hierarchy.

### 6.2 Content pools are canonical runtime inputs

The runtime loads canonical content pools for the learning surfaces it needs, including:
- micro-topic content;
- Quick Learn/content where currently used;
- Deep Dive;
- Active Recall;
- questions;
- revision guidance;
- home-learning content.

Do not create duplicate stores for the same learner content.

### 6.3 app/runtime.js is the shared learner runtime

Shared routing, content loading, progress, rendering, practice, revision, and learning behaviour should remain coherent through the existing runtime architecture.

Do not create page-specific copies of the same business logic unless there is a demonstrated need.

### 6.4 Progress is local learner state

The existing learner progress store uses the established local browser storage key:

netPsychProgress

Do not change the storage contract casually. Changes to progress state can affect existing learner continuity.

### 6.5 Backward compatibility belongs at the boundary

Legacy links/bookmarks may require compatibility handling.

Compatibility code should:
- solve a real compatibility need;
- remain isolated at the route/input boundary;
- preserve the canonical current route/data model;
- not become a second runtime architecture.

### 6.6 Service-worker caching is infrastructure, not content logic

The service worker should support reliable delivery of the current application and canonical runtime data.

Cache identifiers must track the project SemVer.

Do not put learner logic into the service worker merely for convenience.

## 7. UX and responsive design

### 7.1 All major form factors matter

The website must work properly on:
- phones;
- tablets;
- tablet landscape;
- laptops/desktops.

Tablet landscape is a deliberate target, not an edge case.

### 7.2 Mobile is a first-class experience

Do not simply shrink the desktop layout.

Mobile design should consider:
- touch targets;
- thumb reach;
- vertical progression;
- readable text;
- low visual clutter;
- clear primary actions.

### 7.3 Progressive disclosure

Do not show every detail immediately.

Present enough information for the current decision and reveal deeper information when useful.

This supports the approved micro-topic progression without forcing every learner through maximum detail.

### 7.4 Navigation should answer “where next?”

The learner should understand:
- where they are;
- what they are learning;
- what they can do next.

Avoid unnecessary navigation choices.

### 7.5 Overlays and prompts should respect learner control

Do not repeatedly interrupt study with prompts.

If a learner explicitly declines an install prompt, the site should respect the agreed suppression behaviour rather than repeatedly displaying the same overlay.

### 7.6 Progress is feedback, not decoration

Progress indicators should help the learner decide what to do next.

Do not create metrics merely because they look impressive.

Different progress signals should answer different questions, such as:
- What have I explored?
- What have I mastered?
- What is due for revision?
- How am I performing in practice?

## 8. Information architecture and duplication rules

### 8.1 One fact, one primary home

Every important piece of information should have a natural primary location.

Examples:
- syllabus structure → syllabus;
- concept explanation → micro-topic;
- extended conceptual connection → Deep Dive;
- retrieval prompts → Active Recall;
- question performance → Practice;
- scheduled return → Revision/Progress.

Other screens may reference it when that supports a different decision.

### 8.2 No repeated blocks for convenience

Do not copy a complete explanation into Home, Dashboard/Progress, Topic, Micro-topic, Deep Dive, and Practice merely to avoid navigation.

Instead, provide a clear link or action to the canonical location.

### 8.3 Don't overload the home screen

Home should orient the learner and help them start or continue learning.

It should not become a second syllabus, notes repository, analytics dashboard, and practice page at once.

## 9. Engineering principles

### 9.1 Root cause before code change

For every bug:
1. identify the actual failure;
2. trace it to its root cause;
3. confirm which layer owns the problem;
4. make the smallest safe change;
5. check related paths;
6. validate the affected flow.

Do not patch symptoms while leaving the root cause intact.

### 9.2 Preserve working contracts

Treat these as contracts unless intentionally changed:
- routes;
- data keys;
- localStorage keys;
- content schemas;
- canonical content paths;
- page responsibilities;
- learning-state semantics.

### 9.3 No dead or duplicate architecture

Do not retain or recreate architecture that was deliberately removed.

In particular, do not reintroduce:
- parallel source-synthesis runtime layers;
- duplicate micro-topic explanation systems;
- unused alternate content calculations;
- obsolete learner-facing sections.

### 9.4 Avoid speculative refactoring

A change should have a reason.

Do not:
- rename files for aesthetics;
- reorganize directories without need;
- rewrite working functions merely for style;
- introduce frameworks or dependencies without a concrete benefit.

## 10. Naming and versioning

### 10.1 Semantic Versioning only

Use:

MAJOR.MINOR.PATCH

Meaning:
- MAJOR — breaking change;
- MINOR — backward-compatible feature or capability;
- PATCH — backward-compatible bug fix.

Examples:
- 1.0.0
- 1.0.1
- 1.1.0
- 2.0.0

Never use descriptive suffixes as part of the version.

Not acceptable:
- 1.4.2-progress-storage
- 1.4.1-route-compatibility
- 1.4.0-canonical-learning-production

### 10.2 Version values and cache identifiers

The same SemVer should be used consistently by:
- project version values;
- runtime fallback values;
- service-worker cache identifiers;
- relevant asset/cache-busting identifiers.

Example:

netpsych-shell-v1.4.2

### 10.3 File naming

New files should use:

lowercase + kebab-case + descriptive responsibility

Examples:
- project-governance.md
- content-version.js
- source-to-content.py

Do not randomly rename stable files.

Rename an existing file only when its architectural responsibility genuinely changes.

Keep stable public/runtime filenames stable. In particular:

microtopic.html remains microtopic.html.

## 11. GitHub change-management rules

### 11.1 Focused branches and PRs

A meaningful change should be represented by a focused branch and PR.

A PR should:
- have one clear purpose;
- contain related changes only;
- explain the problem and solution;
- state validation performed;
- avoid unrelated cleanup.

### 11.2 Check related issues, but control scope

Before finalizing a PR:
- check whether the same problem exists elsewhere;
- identify related issues;
- suggest related improvements when they materially support the requested goal.

Do not silently expand the PR into unrelated work.

### 11.3 Approval before merge

Never merge a PR without explicit user approval.

Before requesting approval:
1. review the implementation;
2. check similar issues elsewhere;
3. validate relevant files and flows;
4. report anything that remains uncertain;
5. explain exactly what the PR changes;
6. ask for approval.

After approval:
- merge the approved PR;
- verify available CI/workflow results;
- check the resulting main branch state.

### 11.4 No false validation claims

Never say:
- the live site was tested unless it was actually tested;
- CI passed unless the relevant run was observed;
- all buttons work unless that was actually verified.

Distinguish clearly between:
- static/code validation;
- automated CI;
- live browser testing;
- device testing.

## 12. Content production and uploaded sources

When the project receives a new source file:

Source → identify useful knowledge → map to syllabus → enrich canonical content → validate → publish

Do not simply append the new source as another reading layer.

For each relevant micro-topic, consider whether the source improves:
- conceptual explanation;
- important distinctions;
- examples;
- theories/models;
- researchers;
- terminology;
- application;
- exam relevance;
- retrieval cues;
- Deep Dive.

Only add material when it improves the learner's understanding or decision.

## 13. PWA and deployment

The website should remain easy to maintain and deploy through GitHub Pages.

Prefer:
- simple static architecture;
- understandable files;
- minimal dependencies;
- predictable service-worker behaviour;
- deterministic content loading.

When application/runtime files change:
- update the SemVer appropriately;
- keep cache identifiers consistent;
- ensure stale cached assets cannot silently break the current runtime.

When content changes:
- validate the relevant JSON/data;
- validate generated content where automated checks exist.

## 14. Decision hierarchy

When principles compete, use this order:

1. Learner safety and correctness
2. Learning effectiveness
3. Preservation of working behaviour
4. Clarity and consistency
5. Maintainability
6. Performance
7. Aesthetic improvement

A visually cleaner solution is not automatically better if it makes learning harder or breaks established behaviour.

## 15. What must not happen

Never:
- fix what is not broken;
- add features without a learner problem;
- duplicate content merely because it exists in multiple sources;
- create parallel architectures for the same learner task;
- recreate deliberately removed source-synthesis runtime layers;
- turn micro-topics into generic AI-generated filler;
- present generated questions as PYQs;
- change approved mastery or revision semantics casually;
- change progress storage contracts casually;
- randomly rename stable files;
- use non-SemVer version strings;
- silently expand a PR into unrelated refactoring;
- claim tests that were not actually performed;
- merge without user approval;
- preserve obsolete architecture just because it already exists.

## 16. Governance rule

This file is the project's single reference point for agreed website philosophy and architectural principles.

If a future request conflicts with a rule here:
1. identify the conflict;
2. explain the trade-off;
3. do not silently override the existing decision;
4. propose the change;
5. update this document only after the new decision is explicitly agreed.

The goal is not to prevent evolution.

The goal is to make evolution intentional, traceable, learner-centred, and consistent with the architecture we have already agreed to build.
