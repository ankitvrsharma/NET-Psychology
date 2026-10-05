# Revision & Progress

## Current storage model

Learner progress is stored locally in the browser. The website's study content is separate from the learner's personal progress.

This supports the current static/PWA deployment model without requiring a server account.

## Learning stages

The learner-facing progression is:

**NEW → LEARNING → RETENTION → MASTERED**

Mastery should be interpreted as evidence accumulated through the learning cycle, not simply as a completion flag.

## Revision ratings

The current revision interface uses:

- Again
- Hard
- Good
- Easy

These ratings are used to determine the next revision interval.

## Important consistency rule

There should be one coherent learner state. Pages should not independently invent competing definitions of:

- progress;
- mastery;
- revision due state;
- completion.

## Planned WAL/reducer model

The agreed future architecture is offline-first:

**User action → immutable local event/WAL → immediate local state update → sync/reconcile when online**

A reducer would transform events into one canonical learner state.

This is PLANNED. There is no claim here that a cloud synchronisation backend currently exists.

## Revision philosophy

Revision should be triggered by learning evidence and elapsed time. It should not become a second copy of the learning page.

A revision view should answer a different question:

> What should I retrieve now, and why is it due?
