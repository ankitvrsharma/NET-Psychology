# Unified multi-source synthesis

## Policy
Every micro-topic treats the complete source library as a candidate evidence set. Sources are not assigned permanent unit/function roles. A source contributes only when its material actually supports the topic.

## Synthesis flow
1. Identify the micro-topic and its PYQ context.
2. Search the complete source library for relevant evidence.
3. Compare terminology, mechanisms, examples, research findings and distinctions.
4. Preserve source-supported differences instead of silently reconciling them.
5. Write one coherent learner-facing explanation.
6. Keep provenance attached to the synthesis without rendering separate source-lens sections.

## Current migration
The first migration converts the existing 26-topic Kaplan/Simply Psychology enrichment set into the unified schema. The schema is deliberately broader than those two sources so subsequent topic regeneration can use the complete library without another architecture change.

## Integrity rule
A source is never credited merely because it is in the candidate set. Evidence must be retrieved from that source before it is presented as contributing to a topic.

## Learner-facing content distribution

The **Explanation** is intentionally not a collection of fixed sub-sections. It is one clean teaching narrative.

- Use **bold emphasis** for genuinely important terms, relationships or distinctions.
- Add a **small inline nudge** wherever it helps the learner notice a useful qualification, implication, memory cue, or potential misunderstanding. A nudge is never rendered as a separate section.
- Add a **PYQ cue inline only when the available PYQ evidence supports it**. Do not turn a generic “PYQ-style” instruction into a claim that a point was actually asked.
- Keep research detail, extended comparisons and advanced connections in **Deep Dive**.
- Keep retrieval prompts in **Active Recall**.
- Keep spaced reactivation in **Revision**.
- Keep answer discrimination, distractors and question-level reasoning in **MCQ Practice / PYQs**.
- Avoid repeating the same information across these surfaces unless the repetition serves a different learning decision.

### Supported micro-topic fields

New or regenerated micro-topic content may use:

- explanation — preferred learner-facing explanation.
- key_points — high-value points that may be integrated into the explanation and selectively bolded.
- inline_nudges — optional small contextual nudges; these are rendered inline without a heading.
- pyq_context — optional PYQ-specific explanation, used only where actual PYQ evidence supports it.

Existing expert_explanation, content_notes, and related fields remain valid fallbacks while content is regenerated. This change is therefore a **presentation/content-model transition**, not a claim that every existing micro-topic has already been rewritten to the new standard.
