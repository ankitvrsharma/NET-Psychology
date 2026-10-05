# NET Psychology Wiki

> Documentation baseline: `main` branch, October 2026.

This wiki documents the **UGC NET Psychology Study Hub** as it exists in the repository, plus the architectural direction agreed during project planning.

## Start here

- [Learner Guide](Learner-Guide.md) — how a learner is expected to use the system.
- [Learning System](Learning-System.md) — learning-cycle, retrieval, application, practice, revision and mastery.
- [Architecture](Website-Architecture.md) — current code structure and responsibilities.
- [Content System](Content-System.md) — content pools, synthesis, provenance and publication.
- [Practice & PYQs](Practice-and-PYQ.md) — question types, provenance and answer/explanation rules.
- [Revision & Progress](Revision-and-Progress.md) — learner state and revision behaviour.
- [PWA & Offline](PWA-and-Offline.md) — installation, caching and local data.
- [Responsive Design](Responsive-Design.md) — mobile, tablet and laptop principles.
- [Development Guide](Development-Guide.md) — safe places to make changes.
- [Future Architecture](Future-Architecture.md) — approved design direction that is not yet treated as implemented.

## Current baseline

The current learner-facing site is a static web application for **UGC NET Psychology**. The retained syllabus is organised as:

**10 units → 118 topics → 549 micro-topics**

The learner journey is designed around:

**Understand → Recall → Apply → Practice → Schedule Revision**

The repository's current application code still has `app.js` as a major orchestration layer. Content loading is already separated through the content-pool registry and publication configuration.

## Documentation rule

This wiki deliberately separates:

- **CURRENT** — verified against the code/configuration on `main`.
- **PLANNED** — agreed architecture or improvement that has not been implemented.

Do not use a PLANNED section as evidence that a feature already exists.

## Maintenance principle

The website is a learner system, not a collection of pages. Changes should preserve learning flow, content consistency, provenance, responsive behaviour and the distinction between actual PYQs and generated practice.

Do not change working behaviour merely to make the code look different.
