# Development Guide

## Before changing code

1. Identify the learner decision the change supports.
2. Find the current implementation rather than creating a parallel one.
3. Check similar behaviour elsewhere in the site.
4. Preserve working behaviour.
5. Decide whether the change is content, presentation, state, navigation or infrastructure.

## Safe change order

For architectural work, prefer:

**Adapter → test/validate → migrate one responsibility → remove duplication later**

Do not begin by deleting the existing central application layer.

## Content changes

When adding source material:

1. identify the relevant syllabus location;
2. synthesise the source into the correct content layer;
3. preserve provenance;
4. validate the content contract;
5. run the publication gate;
6. verify learner rendering.

Do not paste the same source material into every page.

## Code changes

Use the existing registry and canonical content layer. If a new module needs data already provided by `app.js`, create an adapter rather than duplicating the data-loading logic.

## Validation

The intended CI pipeline should eventually validate:

- JSON/schema contracts;
- duplicate syllabus IDs;
- content provenance;
- question contracts;
- broken references;
- JavaScript syntax;
- HTML integrity;
- runtime smoke behaviour.

## Git workflow

The project workflow is:

**inspect → propose → approve → branch/PR → validate → review related issues → brief the owner → merge**

Do not commit directly to `main` for feature work.

## Debugging rule

Fix the reported/broken behaviour and adjacent issues that are demonstrably related. Do not refactor unrelated working code.

## Home page rule

Do not redesign the Home page unless the requested change specifically concerns it.
