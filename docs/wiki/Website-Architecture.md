# Website Architecture

## Current architecture

The current site is a static HTML/CSS/JavaScript application. `app.js` remains the central orchestration layer for many learner flows.

Major current responsibilities visible in the application include:

- mobile navigation;
- data/action handling;
- content registry loading;
- content-pool loading;
- canonical content-layer composition;
- publication gating;
- micro-topic ID normalisation;
- expert/structural content audits;
- learner-facing content rendering and flows.

## Content boundary

The application loads `content-pools/registry.json` first, then loads enabled pools through their configured paths.

Canonical content currently includes layers such as:

- micro-topics;
- quick-learning cards;
- deep-dive content;
- deep-dive enrichment;
- active recall;
- revision guidance;
- questions;
- source synthesis.

This boundary is important: page code should consume canonical content rather than independently inventing a second content source.

## Publication boundary

The application reads publication configuration, release manifest and owner overrides. The release manifest is authoritative when available; deterministic audit logic can provide a fallback.

The current policy distinguishes PASS, REVIEW and ISSUE content. Owner overrides exist separately.

## Question boundary

Question auditing checks answerability, mapping, explanations and structural contracts. The code contains specialised handling for formats including matching and assertion-reason questions.

## Current limitation

The architecture is not yet a fully modular learning engine. The agreed façade/adapter approach is intended to reduce risk while gradually extracting responsibilities from `app.js`.

## Do not do

- Do not replace `app.js` wholesale without a migration path.
- Do not create parallel progress stores.
- Do not bypass the content registry.
- Do not publish content that fails the publication contract merely to fill a page.
- Do not alter the Home page as part of unrelated refactoring.
