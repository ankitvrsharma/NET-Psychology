# V2 Release Readiness

Generated: 2026-10-05

## Status

**HARDENING PR IN PROGRESS — NOT_READY_FOR_PUBLIC_RELEASE**

This branch contains release-safety and packaging fixes, but it must not be described as a complete V2 public release until the blockers below are resolved.

## Coverage audit

- 10 units
- 118 topics
- 549 syllabus micro-topics
- 430 canonical micro-topic records
- **549 micro-topics are currently resolvable through canonical content or the existing legacy-key migration layer**
- **0 syllabus micro-topics are currently missing effective micro-topic content**

> The earlier 106-missing figure was based on a stale coverage calculation that did not account for the current canonical/legacy-key resolution layer. The release gate now distinguishes raw canonical-record count from effective learner-facing coverage.

## PYQ routing

- 1583 PYQs in the question bank
- **1421 currently have complete unit/topic/micro routing**
- **162 remain without complete syllabus routing**

The 162 unresolved records are intentionally not auto-routed merely to improve the metric; routing must be supported by the question wording and syllabus taxonomy.

## Content QA snapshot

| Pool | PASS | REVIEW | ISSUE |
|---|---:|---:|---:|
| Micro-topics | 440 | 0 | 0 |
| Questions | 711 | 770 | 102 |
| Quick Learn | 2,626 | 265 | 189 |
| Active Recall | 711 | 770 | 102 |

The existing publishing gate remains authoritative; this PR does not mark unresolved material as approved merely to make the release numbers appear complete.

## V2 safety fixes in this branch

- Learn-page unit cards now count only micro-topics that pass the learner-facing publishing gate, preventing incomplete syllabus entries from being presented as available study content.
- Deep Dive now loads the dedicated `deepDiveEnrichment` pool instead of leaving the enrichment pool registered but unused.
- The PWA service worker now caches the dedicated Deep Dive enrichment pool and revision guidance when requested.
- The shell/data cache baseline is bumped to V2 so returning learners are less likely to retain stale V1 assets.
- README syllabus counts are synchronized to the current 10-unit / 118-topic / 549-micro-topic taxonomy.
- PWA manifest now declares 192px, 512px and maskable icon variants.
- Offline application shell now includes learner.html, deep-dive.html and question-renderer.js.

## Required before V2 public sign-off

1. Keep the 549 effective micro-topic coverage under regression testing; no additional population pass is currently required.
2. Route the 162 remaining PYQs to the correct unit/topic/micro-topic where the question wording supports a defensible mapping.
3. Resolve the remaining content QA ISSUE queue and highest-value REVIEW queue rather than lowering the publishing threshold.
4. Run browser/device smoke tests on phone, tablet and laptop, including PWA installation and offline navigation.

Home-page design is intentionally untouched by this readiness work.

This PR refreshes the release audit so the public-release gate reflects the current runtime taxonomy and routing state. It is not a declaration that V2 is publicly release-ready.
