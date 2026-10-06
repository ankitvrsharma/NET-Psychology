# NET-Psychology — Website Philosophy & Governance Charter

> This document defines **how the project makes product, learning, UX, content, and engineering decisions**.
>
> It is not a catalogue of website features. Current implementation details belong in architecture documentation.

## 1. Purpose

NET-Psychology exists to help a learner prepare effectively for UGC NET Psychology and NET-JRF.

The product is judged by whether it improves the learner's ability to understand, retrieve, apply, distinguish, retain, and perform in the examination.

The website is a means to that end.

### Governing principle

**Learning outcomes take priority over feature quantity, visual novelty, and implementation convenience.**

## 2. Learner-first decision making

### Principle

Every product decision must begin with the learner's problem, not with what the technology can display.

### Rules

Before adding, removing, or changing something, ask:

1. What learner problem exists?
2. What evidence shows that the problem is real?
3. What learner behaviour should change?
4. Why is this intervention appropriate?
5. What existing behaviour might it disrupt?
6. How will we know whether the intervention worked?

If there is no meaningful learner problem, do not introduce the change.

## 3. Learning before interface

### Principle

The interface should serve the learning process; the learning process should not be distorted to justify interface features.

### Rules

- Every interaction should have a cognitive or navigational purpose.
- Do not add a control merely because it is technically possible.
- Do not expose internal system complexity to the learner.
- Prefer fewer, clearer choices over many equivalent choices.
- A visually attractive solution is inferior to a less attractive solution when it produces worse learning behaviour.

## 4. Cognitive effort must be spent deliberately

### Principle

Learner attention and working memory are limited resources.

### Rules

- Remove unnecessary decisions, navigation, visual noise, and repetition.
- Do not make the interface difficult merely to make learning difficult.
- Productive difficulty should come from the learning task, not poor UX.
- Present information progressively when the learner does not yet need all of it.
- Deeper information should be available when it serves understanding, comparison, application, or another meaningful decision.

### Anti-pattern

**Complexity is not depth.**

A page containing more text, controls, cards, or animations is not automatically a better learning experience.

## 5. Retrieval should be preferred over passive recognition

### Principle

When the learning objective is remembering, the system should favour retrieving information over repeatedly recognising information on the screen.

### Rules

- Give the learner an opportunity to think before revealing an answer when appropriate.
- Do not treat reading as proof of remembering.
- Do not treat seeing an explanation again as proof of revision.
- Practice should require a meaningful learner response.
- Feedback should help the learner understand what the response means for subsequent learning.

## 6. Understanding, retrieval, application, and mastery are different states

### Principle

Different kinds of evidence represent different kinds of learning.

### Rules

Do not collapse:

- exposure into understanding;
- understanding into recall;
- recall into application;
- completion into mastery.

A learner should not be labelled successful merely because they opened, read, or completed a screen.

Mastery claims must be based on the learning evidence defined by the product's approved learning model.

## 7. Productive difficulty, not arbitrary friction

### Principle

The system should make learning effortful where effort improves learning, while removing effort that serves no learning purpose.

### Rules

- Preserve useful retrieval effort.
- Preserve useful comparison and discrimination.
- Preserve useful application demands.
- Remove avoidable navigation and interface friction.
- Increase challenge when the learner is ready rather than merely adding complexity.

## 8. Spacing and forgetting are part of the design

### Principle

Learning should survive the passage of time, not only the immediate study session.

### Rules

- Returning to a page is not automatically a successful revision.
- Revision should provide an opportunity to retrieve or reconstruct knowledge.
- Previous performance should inform future learning where the system supports it.
- Forgetting is information about learning state, not a moral failure.
- Changes to revision semantics require deliberate evaluation because they alter the learning model.

## 9. Practice should change learning, not merely produce scores

### Principle

A question is valuable when the learner's response provides useful information or practice.

### Rules

- Questions should have a learning purpose.
- Errors should guide the next useful action where possible.
- Practice should distinguish concepts that learners are likely to confuse.
- Feedback should be proportionate to the learning need.
- Scores must not be presented as more meaningful than the evidence behind them.

### Integrity rule

A generated practice question must never be represented as a genuine previous-year question.

## 10. One knowledge, one primary home

### Principle

Information should have a clear canonical home.

### Rules

- Do not duplicate an explanation simply because several pages could display it.
- Repeat information only when the repetition performs a different cognitive function.
- Prefer references, links, prompts, or contextual cues over copying complete content.
- Before adding content, check whether the learner already has an adequate canonical representation.

### Test

If removing the duplicate would not remove a distinct learner decision or learning function, the duplicate probably should not exist.

## 11. Content must earn its place

### Principle

Every additional piece of information consumes learner attention.

### Rules

Content should be added because it improves at least one of:

- understanding;
- discrimination between concepts;
- retrieval;
- application;
- retention;
- examination performance.

Do not add material merely because:

- a source contains it;
- an AI model can generate it;
- another website contains it;
- a page looks empty without it.

**More content is not the same as more preparation.**

## 12. Sources are evidence, not competing learner experiences

### Principle

Books, PDFs, PYQs, notes, and other approved sources are inputs into content production. They should not become parallel learner-facing versions of the same knowledge.

### Rules

- Preserve source-supported terminology and distinctions.
- Use multiple sources to improve the canonical learning material.
- Do not force learners to reconcile contradictory source presentations when the product can provide a clear supported explanation.
- Do not attribute unsupported claims to a source.
- Do not manufacture provenance.
- New sources should improve quality, not merely increase volume.

## 13. Content should be faithful before it is clever

### Principle

Exam preparation requires trustworthy knowledge.

### Rules

- Do not silently invent facts to make an explanation sound complete.
- Do not replace source-supported terminology with fashionable wording merely for style.
- Preserve important theoretical distinctions.
- When sources do not support a claim, mark the gap rather than filling it invisibly.
- When synthesis is necessary, distinguish synthesis from direct source content during production and validation.

## 14. The learner should always have a useful next decision

### Principle

A learning system should reduce uncertainty about what to do next.

At any meaningful point, the learner should be able to determine whether the next useful action is to understand, retrieve, apply, compare, revise, continue, or stop because the current objective has been adequately met.

### Rule

Do not present several equally prominent actions when one is clearly the intended next step.

## 15. Progressive disclosure over information dumping

### Principle

Give the learner what is needed for the current decision, then expose additional depth when it becomes useful.

### Rules

- Start with the conceptual structure needed for understanding.
- Reveal depth when it supports a real learning need.
- Do not hide essential information merely to create more clicks.
- Do not force every learner through maximum detail.

Progressive disclosure must reduce cognitive load, not become artificial fragmentation.

## 16. Responsive design is contextual adaptation

### Principle

A learner's device changes the interaction context, not the importance of learning.

### Rules

- Mobile, tablet, tablet landscape, and laptop experiences must preserve the same learning logic.
- Do not simply shrink desktop layouts.
- Touch interaction must be practical.
- Reading and retrieval must remain comfortable on small screens.
- Wider screens may expose more context, but must not introduce unnecessary cognitive complexity.
- A responsive change must not silently change the meaning of a learning state.

## 17. Accessibility is part of learning quality

### Principle

Accessibility is not an optional visual enhancement; it determines whether learners can use the learning system.

### Rules

- Information hierarchy must remain understandable without decorative cues.
- Interactive elements must be perceivable and usable.
- Text must remain readable.
- Meaning must not depend solely on colour.
- Motion and visual effects must never obstruct comprehension or essential interaction.

## 18. Consistency is a learning aid

### Principle

Predictability reduces unnecessary cognitive load.

### Rules

Use consistent terminology, hierarchy, interaction patterns, navigation conventions, feedback meanings, progress semantics, and responsive behaviour.

Do not introduce a new interaction pattern when an established pattern already solves the same problem.

## 19. Preserve working behaviour

### Principle

Stability is part of product quality.

### Rules

- Do not change working behaviour without a concrete reason.
- Do not refactor stable code merely because another implementation looks cleaner.
- Do not replace a working architecture without demonstrated need.
- Do not perform unrelated cleanup inside a focused change.
- When something is broken, identify the smallest root cause and make the smallest safe correction.

**Working code is not broken merely because it could be written differently.**

## 20. Root cause before intervention

### Principle

Fix causes, not symptoms.

### Rules

For a defect:

1. establish the failure;
2. identify the affected behaviour;
3. trace the failure to its owning layer;
4. determine the smallest responsible cause;
5. make the smallest safe correction;
6. inspect related paths for the same failure mode;
7. validate the affected behaviour.

Do not broaden a bug fix into speculative refactoring.

## 21. Complexity must justify itself

### Principle

Every additional abstraction, data layer, dependency, or runtime path creates maintenance cost.

### Rules

- Prefer one canonical implementation over parallel implementations.
- Do not maintain two systems for the same learner task.
- Remove obsolete architecture when it has been deliberately replaced.
- Avoid speculative abstractions.
- Avoid dependencies that do not solve a concrete problem.
- Keep the system understandable to its intended maintainer.

## 22. Compatibility should be deliberate

### Principle

Existing learner continuity is valuable.

### Rules

- Treat established routes, data contracts, progress state, and content identifiers as contracts unless intentionally changed.
- Preserve compatibility where reasonably possible when implementation changes.
- Isolate compatibility logic at system boundaries.
- Do not allow compatibility code to become a second architecture.
- Breaking a contract requires an explicit reason and appropriate migration or fallback planning.

## 23. Change management

### Principle

Changes should be intentional, traceable, and reversible where practical.

### Rules

Every meaningful change should establish:

**Problem → Evidence → Decision → Intervention → Risk → Validation**

Before implementation:

- inspect the relevant existing behaviour;
- check for similar problems elsewhere;
- identify dependencies and contracts;
- consider whether the requested change creates duplication.

After implementation:

- validate the affected flow;
- report limitations honestly;
- avoid claiming validation that was not performed.

## 24. Scope discipline

### Principle

A good change solves the intended problem without creating unnecessary new problems.

### Rules

- Keep PRs focused.
- Related improvements may be suggested, but should not silently enter the requested change.
- Do not use a feature request as an excuse for unrelated cleanup.
- If a broader architectural change is genuinely required, stop and explain why before expanding scope.

## 25. Naming and versioning are consistency rules

### Principle

Names and versions are contracts, not decoration.

### Rules

Use Semantic Versioning only:

**MAJOR.MINOR.PATCH**

- MAJOR — breaking change;
- MINOR — backward-compatible capability;
- PATCH — backward-compatible fix.

Never append descriptive suffixes to versions.

New filenames should be:

**lowercase + kebab-case + descriptive responsibility**

Do not rename an established file merely for aesthetics. Rename only when its responsibility genuinely changes.

## 26. GitHub governance

### Principle

Repository changes should remain reviewable and intentional.

### Rules

- Use focused branches and PRs.
- Check related issues or similar problems before finalising a change.
- Explain the problem, decision, scope, and validation in the PR.
- Seek explicit user approval before merging.
- After approval, merge only the approved change.
- Verify available CI/workflow results after merge.
- Do not claim live/device validation unless it actually occurred.

## 27. Decision hierarchy

When principles conflict, prioritise:

1. **Learner safety and correctness**
2. **Learning effectiveness**
3. **Preservation of working behaviour**
4. **Clarity and consistency**
5. **Maintainability**
6. **Performance**
7. **Aesthetic improvement**

A prettier solution does not win against a safer or more effective one.

## 28. What this project must resist

The following are recurring failure modes and should be actively resisted:

- feature accumulation without a learner problem;
- content accumulation without a learning purpose;
- duplicate explanations;
- generic AI filler;
- passive reading disguised as learning;
- scores mistaken for mastery;
- page completion mistaken for learning;
- unnecessary interface complexity;
- parallel implementations of the same capability;
- speculative refactoring;
- breaking working behaviour for aesthetic reasons;
- random renaming;
- non-SemVer versioning;
- unrelated PR expansion;
- unverified claims about testing;
- silently overriding an agreed decision.

## 29. How this charter changes

This charter should remain stable.

A new principle should be added only when:

- a recurring decision cannot be handled by the existing principles;
- the principle generalises beyond one feature;
- it prevents a meaningful future mistake;
- and it is explicitly agreed.

A feature, bug, file path, or implementation detail does not belong here merely because it is important today.

### Final rule

**The website should evolve because the learner's needs, evidence, or a demonstrated technical constraint justify the change—not because change itself feels productive.**
