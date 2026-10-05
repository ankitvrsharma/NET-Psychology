# V2 Release Readiness

Generated: 2026-10-05

## Status

**NOT_READY_FOR_PUBLIC_RELEASE**

This branch contains release-safety and packaging fixes, but it must not be described as a complete V2 public release until the blockers below are resolved.

## Coverage audit

- 10 units
- 118 topics
- 549 syllabus micro-topics
- 430 canonical micro-topic records
- 443 micro-topics currently resolvable through canonical content or the existing legacy-key migration layer
- **106 micro-topics remain without effective content**

## PYQ routing

- 1583 PYQs in the question bank
- 1415 have a unit assignment or an existing explicit override
- **168 remain without a unit assignment**

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
- README syllabus counts are synchronized to the current 10-unit / 118-topic / 549-micro-topic taxonomy.
- PWA manifest now declares 192px, 512px and maskable icon variants.
- Offline application shell now includes learner.html, deep-dive.html and question-renderer.js.

## Required before V2 public sign-off

1. Populate and audit the 106 missing micro-topics using the project's supplied source library.
2. Route the 168 remaining PYQs to the correct unit/topic/micro-topic where the source supports that mapping.
3. Resolve the remaining content QA ISSUE queue and highest-value REVIEW queue rather than lowering the publishing threshold.
4. Run browser/device smoke tests on phone, tablet and laptop, including PWA installation and offline navigation.

Home-page design is intentionally untouched by this readiness work.
