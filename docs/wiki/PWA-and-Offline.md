# PWA & Offline

## Current model

The website is designed as a static web application and includes PWA-related files such as the web manifest and service worker.

The deployment target is GitHub Pages.

## Local learner data

Learner progress is stored in the browser. This makes the basic learning experience usable without a user account.

## Offline-first principle

The existing PWA/offline behaviour should be preserved while the application architecture evolves.

## Planned write-ahead log

The agreed improvement is a browser-side WAL/event queue:

1. learner performs an action;
2. action is written locally as an event;
3. learner state updates immediately;
4. queued events can be synchronised/reconciled when an online backend exists.

This must not be described as cloud sync until an actual backend and sync protocol are implemented.

## Safe migration

Do not replace working service-worker or local-storage behaviour simply to introduce the WAL design. Introduce an adapter around the current persistence first, then migrate incrementally.

## PWA testing checklist

Whenever persistence or service-worker code changes, verify:

- fresh load;
- repeat load;
- offline load;
- learner progress survives reload;
- content assets resolve;
- navigation works;
- cache does not serve stale incompatible data;
- installation metadata remains valid.
