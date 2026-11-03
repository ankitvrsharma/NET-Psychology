# Micro-topic content quality audit

**Reviewed file:** `content/microtopics/micro_topics.json`  
**Review date:** 3 November 2026  
**Scope:** structural and editorial audit of all records, with special attention to whether a learner receives an actual explanation rather than a generic instruction.

## Inventory

- **549** micro-topic records, corresponding to the 549 syllabus micro-topics.
- **549/549** records contain an explanation field, expert-explanation field, content-notes field and a source-ID array.
- **549/549** records have an empty `key_points` array. This means the short-notes panel cannot rely on curated key-point bullets from this field.
- **87** records use the same generic placeholder explanation (for example, “identify its defining construct…” and “application/context”) rather than explaining the named concept.
- The runtime content-readiness rule now excludes those 87 placeholder records: **462/549** are treated as learner-ready, while **87** remain unavailable for learning until rewritten. They remain visible in the syllabus map and are not counted as released lessons.
- **278** records include the literal editorial marker `SOURCE BASIS` inside the learner-facing explanation text. Source provenance should be kept in metadata, not mixed into the teaching explanation.
- **106** records use the same generic revision-check prompt instead of a topic-specific retrieval question.
- **87** records use the generic exam takeaway `definition/core construct`.
- All 549 records contain source IDs, but the IDs represent broad source associations rather than page-level citations. A source ID alone does not prove that every listed source contains the specific claim.

## Interpretation

The file is not empty and should not be replaced with a blank pool. It contains a substantial body of usable explanations, including source-grounded teaching content. However, the quality is uneven. The principal issue is not missing records; it is the difference between a populated field and a useful learning explanation.

A record should not be considered learner-ready merely because its explanation field is non-empty. In particular, generic prompts, editorial provenance markers and empty key-point arrays reduce the usefulness of the short-notes and detailed-explanation views.

## Highest-priority remediation

1. Replace the 87 generic explanations with concept-specific explanations, beginning with research methods/statistics, psychological testing, biological bases, learning, cognition, personality, emotion/stress, social psychology and clinical psychology.
2. Move every `SOURCE BASIS` passage out of the explanation body. Keep source identifiers and source notes in metadata; add page/section references only after checking the actual source.
3. Populate `key_points` with concise, discriminative points for the short-notes panel. Do not copy the entire detailed explanation into this field.
4. Replace generic revision checks with prompts that require the learner to retrieve a definition, sequence, theorist, mechanism, comparison or application specific to that micro-topic.
5. Replace generic exam takeaways with a precise exam-relevant distinction or relationship. Do not invent a PYQ trend where the question-bank evidence does not support one.

## Generic-explanation records requiring authoring

The following IDs were detected by the audit rule for the repeated placeholder wording:

- Research methods and statistics: `2-2-7` to `2-2-10`, `2-6-3` to `2-6-5`, `2-8-9`, `2-14-5` to `2-14-7`, `2-16-1` to `2-16-5`
- Psychological testing: `3-3-5` to `3-3-7`, `3-4-7` to `3-4-13`
- Biological bases and motivation: `4-4-4` to `4-4-7`, `4-10-1` to `4-10-4`
- Learning and memory: `5-9-2` to `5-9-4`, `5-10-4`, `5-10-5`, `5-10-7`, `5-10-8`, `5-11-4`, `5-11-5`, `5-14-3`, `5-18-9`, `5-18-10`
- Cognition and decision-making: `6-4-6` to `6-4-12`, `6-9-1` to `6-9-3`
- Personality, motivation and stress: `7-2-9` to `7-2-12`, `7-4-7`, `7-4-8`, `7-13-6`, `7-16-7` to `7-16-10`, `7-18-1`
- Social psychology: `8-3-8` to `8-3-15`, `8-4-10` to `8-4-13`, `8-5-2` to `8-5-5`
- Clinical and applied psychology: `9-5-5`, `9-6-17`, `10-5-11`

The ranges above are compact notation for the IDs detected; the audit script is the authoritative exact detector and should be rerun after each content batch.

## Quality gate for future content batches

A lesson is ready to publish only when:
- The explanation defines the named concept accurately and describes its mechanism, structure or stages where applicable.
- The note distinguishes it from the nearest confusable concept.
- The short-notes field contains concise, topic-specific retrieval cues.
- The exam takeaway is a real distinction, relationship or application—not a placeholder.
- The revision check asks a topic-specific retrieval question.
- Source metadata is relevant and traceable; page/section details are not fabricated.
- The lesson is linked to a valid syllabus micro-topic ID.

## Reproducible audit

Run:

```bash
python scripts/audit-microtopic-content.py content/microtopics/micro_topics.json
```

The script reports record coverage, generic placeholders, provenance text in explanations, empty key points, generic revision checks, generic exam takeaways and invalid source metadata. It is an audit tool, not an automatic content rewriter: questionable lessons should be improved from the uploaded references and reviewed before publication.
