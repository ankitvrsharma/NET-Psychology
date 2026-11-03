# Micro-topic content quality audit

**Reviewed file:** `content/microtopics/micro_topics.json`  
**Review date:** 3 November 2026  
**Scope:** structural and editorial audit of the complete 549-record UGC NET Psychology micro-topic pool, followed by the enrichment update on this branch.

## Final inventory after enrichment

- **549** micro-topic records retained and mapped to the syllabus.
- **87/87** generic placeholder explanations rewritten with topic-specific teaching explanations.
- **549/549** short-note `key_points` arrays populated, containing **2,421** concise points in total.
- **106/106** generic revision-check prompts replaced with topic-specific retrieval questions.
- **87/87** generic exam takeaways replaced with concept-specific takeaways.
- **0** records match the known generic explanation placeholder pattern.
- **0** records have empty short-note key-point arrays.
- **0** records retain the known generic revision-check prompt.
- **0** learner-facing explanation fields contain the editorial marker `SOURCE BASIS`.

## Source and provenance limits

Every record retains its existing source-ID associations. These IDs identify broad source resources, not page-level citations. The enrichment must therefore be described as a synthesis informed by the uploaded reference collection, not as individually page-verified claims from every listed source.

No page numbers, quotations or chapter-specific citations have been fabricated. Where a future lesson needs stronger traceability, add a checked chapter/section/page reference only after locating the claim in the relevant source.

## Learning design

The three learner-facing layers have distinct jobs:

- **Short notes (`key_points`):** concise retrieval cues, definitions, discriminations and essential relationships—not a second copy of the detailed explanation.
- **Detailed explanation:** explain the concept and its mechanism, structure, stages or application where appropriate.
- **Revision check:** prompt the learner to reconstruct a topic-specific definition, sequence, comparison, theorist, mechanism or application before revealing the note.

## Quality gate for future content

A lesson is ready to publish only when:
- The explanation defines the named concept accurately and explains its mechanism, structure or stages where applicable.
- The note distinguishes it from the nearest confusable concept.
- Short notes are concise, discriminative and specific to the micro-topic.
- The exam takeaway is a supported relationship, distinction or application—not a generic label.
- The revision check requires topic-specific retrieval.
- Source metadata is relevant and traceable; page/section details are not fabricated.
- The lesson remains linked to a valid syllabus micro-topic ID.

## Reproducible audit

Run:

```bash
python scripts/audit-microtopic-content.py content/microtopics/micro_topics.json
```

The script reports record coverage, generic placeholders, provenance markers in explanation fields, empty key points, generic revision checks, generic exam takeaways and invalid source metadata. It is an audit tool, not an automatic content rewriter.
