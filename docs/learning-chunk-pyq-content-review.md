# Content-level review: learning chunks and PYQ evidence

## Executive finding

The existing 10-unit outline is intact and should remain intact. The content layer is not yet a consistent learner-ready system: all 549 micro-topic IDs have a Deep Dive and Active Recall record, but the standalone Micro-topic, Quick Learn and question pools are empty in the repository snapshot inspected. Of the 549 Deep Dive records, 430 have no `detailed_explanation` content and 430 have no `distinction` content. The `content_notes` field in 149 records uses the same generic PYQ-pattern and teaching-focus template. Those are material gaps, not merely stylistic preferences.

The 71 numbered headings in the seven uploaded REVISATHON PDFs were inspected at question-stem level. The PDFs contain repeated introductory/explanatory blocks as well as actual question stems; 78 topic-heading occurrences were found across files, representing the 71 numbered topic headings used in the existing crosswalk. A heading is not a question ID, official exam year, or verified answer key.

## Existing content-pool inventory

| Pool | Records in current main snapshot | Interpretation |
|---|---:|---|
| Syllabus index | 10 units / 118 topics / 549 micro-topics | Canonical outline; unchanged |
| Deep Dive | 549 | Present for every current micro-topic ID |
| Active Recall | 549 | Present for every current micro-topic ID, but prompt quality varies |
| Standalone Micro-topic | 0 | No separate canonical pool entries |
| Quick Learn | 0 | No quick-card entries |
| Questions | 0 | No standalone question-bank entries |
| Practice MCQs | 0 | Empty object |

## Quality findings from the existing lesson records

- `detailed_explanation` is empty in 430/549 records.
- `distinction` is empty in 430/549 records.
- 149 records reuse the same generic PYQ-pattern sentence and generic five-minute teaching-focus sentence.
- The source PDFs often ask applied questions, sequencing, matching, identifying a false statement, or interpreting a statistic. Generic advice to practise “one scenario and one confusion pair” does not teach the specific reasoning needed for these question types.
- Titles such as a scholar's name or a broad label cannot by themselves establish a natural learning chunk. The chunk must have a single retrievable objective, a sufficient explanation, a discriminating example, and practice aligned with that objective.
- Absence of a separate content-pool record is not proof that the UI cannot render content; the runtime may derive views from the Deep Dive pool. This report flags the data gap and avoids asserting a runtime failure without an end-to-end browser test.

The JSON accompanying this report records quality flags for every current micro-topic ID, including note/deep-dive length, missing explanatory/contrast fields, generic templates, broad-title review flags, and candidate duplicate titles. A flag is a review prompt, not an automatic instruction to split or merge.

## PYQ evidence and mapping decisions

The updated crosswalk links source topic headings to actual current IDs where there is a plausible conceptual fit and explains why. All mappings remain candidates pending question-by-question verification of every stem/options and checking the actual lesson body. It intentionally marks missing-topic candidates where the current index has no exact chunk, rather than forcing a broad match.

Examples of high-value evidence from the PDFs:
- **Theory of Emotion:** Part 2 asks learners to sequence the Schachter–Singer two-factor components (stimulus → physiological arousal → cognitive appraisal → subjective emotion). This tests ordered mechanism knowledge, not just naming the theory.
- **Standardized Scores:** Part 3 asks learners to match Z, stanine, T and sten scores with their means/standard deviations. The chunk should support discrimination and matching, not just definitions.
- **Cortisol Pathway:** Part 3 asks for a sequence involving anterior-pituitary ACTH and adrenal-cortex glucocorticoids, plus immune/hippocampal effects. Teach the HPA pathway and separate primary physiology from downstream claims.
- **Signal Detection:** Part 5 asks which determinants are assumed by signal-detection theory and includes sensitivity/response-bias/threshold distractors. Teach sensitivity versus criterion/bias and the four outcome cells if the source scope supports them.
- **Social Facilitation:** Part 6 asks who observed cyclists racing faster against others (Norman Triplett) and tests an evaluation/arousal sequence. Teach the historical finding and mechanism as related but distinct retrieval targets.
- **Sampling:** Part 7 includes probability versus non-probability sampling and scenario-based selection. A single definition is insufficient; students need to identify methods and trade-offs.
- **Metacognition:** Part 1 asks which activity is not metacognitive and asks about metacognitive features. Teach knowledge about cognition separately from regulation/monitoring and contrast with Theory of Mind rather than conflating them.
- **Levels of Data:** Part 1 asks about interval-scale properties and scale ordering. A strong chunk should require distinguishing identity, order, equal intervals and absolute zero.
- **Item Difficulty vs Item Discrimination:** Parts 3 and 6 separately test item difficulty/p-value and a discrimination-index formula/interpretation. These must not be collapsed into one generic “item analysis” answer.
- **Visual pathways:** Parts 4 and 6 separately ask about the dorsal “where” and ventral “what” pathways. A single shared chunk may introduce the dual-stream distinction, with separate retrieval prompts for each route.
- **Kohlberg:** Part 5 asks about levels/stages and reasoning; the index currently has two same-purpose candidates across Units 7 and 9. Unit 9 is the likely canonical home; preserve the Unit 7 reference until ID and progress impacts are addressed.
- **PERMA and wellbeing:** Part 7 asks which model includes environmental mastery, which points to Ryff's psychological well-being dimensions, not simply the PERMA acronym. This reveals a genuine mapping/coverage gap to inspect.

## Proposed structural decisions (not yet applied to learner content)

1. **Cross-link instead of duplicate:** Transpersonal psychology; psychoanalytic/humanistic perspectives across personality and motivation; cognitive dissonance across theory and attitude change; observational learning across learning, personality and aggression. Keep a distinct application only where it teaches a different objective.
2. **Review and likely relocate:** Main effects/interaction and post-hoc comparisons currently appear under both Factor Analysis and ANOVA. They belong conceptually with ANOVA/mean comparisons when the existing lesson confirms this; do not delete IDs without a migration map.
3. **Choose canonical homes and retain aliases:** Kohlberg's developmental stages (Unit 9 likely canonical), Heuristics (general strategy vs named decision biases), Neuroplasticity (dedicated lesson plus a short nervous-system link), and repeated Eastern-psychology concepts (historical framing vs tradition-specific application).
4. **Create only verified missing chunks:** Candidate gaps include Theory of Mind, Health Belief Model, Reality Therapy, Long-Term Potentiation, Groupthink, explicit visual-stream pathways, glia, and specific item-discrimination/poverty/prevention distinctions. Before adding, inspect parent lessons and the source syllabus; a missing title alone does not prove missing teaching content.
5. **Rewrite the content before restructuring IDs:** For each selected high-priority chunk, create one learning objective; source-grounded explanation; example and non-example; one “confusion pair”; active-recall prompts; a source-backed PYQ link; and a practice item that is clearly labelled as generated unless it is an authentic source PYQ.

## Recommended implementation order

1. Start with the most evidenced gaps: standardized scores, HPA/cortisol pathway, interval scale, item difficulty vs discrimination, signal detection, emotion theory, sampling, metacognition, social facilitation and visual pathways.
2. Compare each exact stem and its options with the matching lesson and source textbook before editing the answer/explanation. Do not infer an answer key from a topic heading.
3. Add authentic PYQs to the question pool only with source/part/page metadata and without inventing a year; keep generated MCQs in their own pool.
4. Correct duplicated/misplaced concepts in a separate index migration, preserving old IDs through redirects or alias mapping and testing saved progress, bookmarks, revision and learner routes.
5. Validate content schema, ID coverage, rendering, mobile/tablet/desktop, all learning flows and build checks before merge.

## Scope boundary

This review PR adds the evidence-backed audit and candidate crosswalk only. It does not rewrite lesson content, modify the 10-unit outline, change IDs, publish unverified answer keys, or alter learner data. Those changes belong in a subsequent implementation PR once each affected chunk has been checked against the source material.
