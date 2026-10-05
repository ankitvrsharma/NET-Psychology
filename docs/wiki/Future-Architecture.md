# Future Architecture

> **Status: PLANNED.** This page records the architecture agreed in project discussions; it is not a claim that these modules already exist on `main`.

## 1. Façade / Adapter

Introduce a `NETApp` façade between pages and the existing `app.js` implementation.

Initial goal:

- preserve existing behaviour;
- expose stable interfaces;
- isolate legacy orchestration;
- migrate responsibilities incrementally.

Conceptually:

```
Pages / UI
    ↓
NETApp Facade
    ├── Learning Core
    ├── Practice Core
    └── Navigation
            ↓
      existing app.js
```

The adapter is a migration layer, not a reason to rewrite the application.

## 2. Event/WAL layer

Learner actions become explicit events.

```
User action
    ↓
Local WAL
    ↓
State update
    ↓
UI
    ↓
Sync/reconcile when online
```

The WAL should be append-oriented and recoverable. It should not pretend that browser storage is a remote database.

## 3. Canonical state reducer

A reducer turns learner events into one canonical state:

```
Events
  ↓
Reducer
  ↓
Canonical Learner State
  ├── progress
  ├── mastery
  └── revision schedule
```

Pages consume this state instead of computing their own versions of progress.

## 4. Learning core

The learning engine should expose stable operations such as:

- get micro-topic state;
- record understanding;
- record retrieval;
- record application;
- record practice;
- calculate mastery;
- request revision.

## 5. Practice core

Question selection, scoring, explanation feedback and provenance should be separable from page rendering.

## 6. Validation in GitHub Actions

A future PR should be blocked when automated checks find:

- duplicate syllabus IDs;
- invalid content schema;
- missing provenance;
- invalid question contracts;
- broken content references;
- JavaScript/runtime errors.

## 7. Migration strategy

Do not implement all layers in one rewrite.

Recommended sequence:

1. façade around current `app.js`;
2. persistence adapter;
3. canonical learner-state reducer;
4. event/WAL recording;
5. learning-core extraction;
6. practice-core extraction;
7. automated schema/content validation;
8. remove duplicated legacy responsibilities only after parity is proven.

## Definition of success

The new architecture is successful only when it preserves current learner behaviour while making state, content, practice and revision easier to test and maintain.

A cleaner folder structure alone is not success.
