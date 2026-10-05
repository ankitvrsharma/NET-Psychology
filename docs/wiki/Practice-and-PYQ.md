# Practice & PYQs

## Two content identities

The website deliberately distinguishes:

### MCQ

A practice question prepared for learning, application or exam-style practice.

### PYQ

A previous-year question whose provenance is available.

Never label generated content as a PYQ.

## Question contract

The application expects answerable four-option questions with a valid answer index and useful explanation. Questions should also map to the syllabus hierarchy where that information is available.

## Supported structured forms

The current auditing/rendering logic includes specialised contracts for formats such as:

- direct questions;
- matching/list questions;
- assertion-reason;
- sequence/structured item sets;
- statement-set style questions.

Structural auditing is intended to catch malformed source extraction, swallowed instructions, invalid list counts and renderer-contract failures.

## Explanation standard

An answer explanation should do more than state the option. It should help the learner understand:

- why the correct answer fits;
- why the distractors do not fit when useful;
- the relevant psychological mechanism/theory;
- the exam distinction or trap.

## Error feedback

An incorrect answer is useful learning data. The system should route the learner toward re-learning or revision rather than simply showing a score and ending the cycle.

## Provenance

For PYQs, preserve the available session/year/source information. For generated questions, make their practice status clear.

## Future question engine

A modular question engine is part of the planned architecture. Until migrated, existing `app.js` and question-rendering behaviour remain the implementation baseline.
