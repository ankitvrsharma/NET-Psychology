# Proposed structural decisions: learning chunks and PYQ alignment

**Purpose:** Convert first-pass title-level flags into specific review decisions for human verification. This is a proposal, not an instruction to silently rewrite the outline.

**Non-negotiable:** Preserve all 10 units and the outline itself. Keep current IDs stable until all data references and learner-progress migration implications are known.

## How PYQs are used

The seven uploaded REVISATHON compilations contain 71 numbered topic headings. Those headings were extracted from the PDFs and used as a discovery index. A heading is not automatically an official question ID, exam year, or verified answer key. The crosswalk therefore marks all title-based matches as provisional and requires question-stem/options verification.

A mapped PYQ should be attached to the smallest chunk that teaches the tested knowledge or skill, with optional secondary links when the question genuinely spans multiple chunks. Do not map a question to every micro-topic in its broad parent topic. Preserve the source wording/options/answer metadata exactly as provided and keep generated MCQs separate.

## Candidate PYQ-to-learning-chunk links

The following links have a plausible, direct relationship to current index entries. They are still candidates until the individual stem, options and answer are inspected.

| PYQ compilation heading | Current hierarchy candidate | Learning value to check |
|---|---|---|
| Levels of Data (Part 1, Topic 12) | Unit 2 → Research Problems, Variables, Hypotheses and Sampling → Levels of measurement | Identify scale/level from examples and select compatible summaries/tests. |
| Measures of Central Tendency (Part 2, Topic 21) | Unit 2 → Statistics in Psychology → Measures of central tendency; Mean, median and mode | Choose a measure from distribution properties and interpret it. |
| Standardized Scores (Part 3, Topic 22) | Unit 3 → Test Standardisation: Reliability, Validity and Norms → Standard scores | Interpret standard scores and connect them to norms; cross-link to z-score/percentile chunks if present. |
| Criterion Validity (Part 3, Topic 26) | Unit 3 → Test Standardisation: Reliability, Validity and Norms | Distinguish criterion-related validity from other forms and identify concurrent/predictive evidence if covered by the source. |
| Item Difficulty (Part 3, Topic 30) | Unit 3 → Psychological Testing, item-analysis content | Calculate/interpret the difficulty index and understand that higher proportion-correct means an easier item in the usual convention. |
| Semantic Differential Scale (Part 3, Topic 31) | Unit 3 → Attitude Scales and Computer-Based Testing → Semantic differential scale | Recognise bipolar adjective anchors and distinguish it from other attitude scales. |
| Classical vs Operant Conditioning (Part 4, Topic 32) | Unit 5 → Classical Conditioning; Instrumental Learning → Operant conditioning | Contrast what is learned, the role of consequences, and representative examples. |
| Signal Detection (Part 5, Topic 43) | Unit 5 → Signal Detection Theory → Assumptions; Applications | Distinguish sensitivity from response criterion and interpret hits, misses, false alarms and correct rejections if tested. |
| Depth Perception (Part 5, Topic 45) | Unit 5 → perception-related topic/chunks | Separate binocular and monocular cues and apply cues to scenarios. Current title matching is insufficient; verify the exact existing children first. |
| Kohlberg Moral Development (Part 5, Topic 46) | Unit 9 → Theories of Development → Kohlberg's moral development; Domains of Development → Moral development | Distinguish levels/stages and the reasoning in a vignette; investigate the duplicate Unit 7 entry. |
| Social Facilitation (Part 6, Topic 53) | Unit 8 → Groups and Social Influence → Social Facilitation | Distinguish audience/coaction effects and performance conditions; contrast with social loafing. |
| Heuristics (Part 6, Topic 59) | Unit 6 → Problem Solving and Decision Making → Heuristics; Decision Making → Heuristics and biases | Teach the general shortcut once, then distinguish the specific bias/application. |
| Sampling (Part 7, Topic 61) | Unit 2 → Research Problems, Variables, Hypotheses and Sampling → Sampling; Sampling techniques | Select a sampling method from a research scenario and identify its strengths/limitations. |
| Multiple Regression (Part 7, Topic 64) | Unit 2 → Regression → Multiple regression | Interpret multiple predictors and the outcome; distinguish it from simple regression and correlation. |
| Observational Learning (Part 7, Topic 67) | Unit 5 → Cognitive Approaches to Learning → Observational learning; Stages of observational learning | Recall/sequence modelled-learning processes and apply them to examples. |
| Erikson's Psychosocial Development (Part 7, Topic 68) | Unit 9 → Theories of Development → Erikson's psychosocial stages | Match life-stage conflicts to scenarios; distinguish from other developmental frameworks. |
| PERMA & Other Models of Well-being (Part 7, Topic 69) | Unit 10 → Wellbeing and Self-Growth → Types of wellbeing; Hedonic wellbeing; Eudemonic wellbeing | Compare models without treating PERMA as synonymous with all wellbeing approaches. |
| Percentile Ranks & Z Score (Part 7, Topic 71) | Unit 3 → Standard scores; related score interpretation in Unit 2 if present | Compute or interpret relative standing and standardised distance; avoid duplicated explanations. |

The crosswalk JSON contains all 71 source headings, including 35 currently lacking a confident title-level match. Those unmatched headings must be reviewed against the actual lesson content before deciding that a topic is missing. A naming mismatch is not proof of a syllabus gap.

## Duplicate-title groups: proposed treatment

### 1. Buddhism, Sufism and Integral Yoga — Unit 1
**Current duplication:** Each appears under both *Eastern Psychological Thought* and *Indian Paradigms of Psychological Knowledge*.

**Proposed decision:** CROSS-LINK first. Use one canonical concept explanation, but allow a distinct comparison or historical framing in the second topic if the syllabus/source content supports it. Do not delete one placement solely because the title repeats.

### 2. Transpersonal Psychology — Units 1 and 7
**Current duplication:** Appears under *Major Schools and Movements of Western Psychology* and *Approaches to Personality*.

**Proposed decision:** CROSS-LINK. Unit 1 can cover historical emergence and its position among schools; Unit 7 can focus on the personality assumptions and applications. Remove duplicated paragraphs only after comparing the actual lesson text.

### 3. Main Effects and Interaction — Unit 2
**Current duplication:** Appears under *Factor Analysis* and *ANOVA*.

**Proposed decision:** RELOCATE the experimental-design/statistical interpretation content to ANOVA if lesson review confirms it is about factorial ANOVA. Factor analysis and factorial experimental design are not the same method. Preserve stable IDs or create a migration mapping rather than simply deleting the old entry.

### 4. Post-hoc Comparisons — Unit 2
**Current duplication:** Appears under *Factor Analysis* and *ANOVA*.

**Proposed decision:** RELOCATE to ANOVA/mean-comparison content if confirmed. Factor analysis does not generally use post-hoc comparisons in the same way as ANOVA. Check whether the Factor Analysis entry is a copy, a mislabelled topic or a different intended idea.

### 5. Neuroplasticity — Unit 4
**Current duplication:** A standalone *Neuroplasticity* topic and a micro-topic under *Central and Peripheral Nervous Systems*.

**Proposed decision:** Keep the dedicated lesson as the canonical explanation; CROSS-LINK from the nervous-system overview where appropriate. If the embedded version has a distinct role, keep a short contextual explanation rather than repeating the full lesson.

### 6. Psychoanalytical Approach — Unit 7
**Current duplication:** Appears under *Approaches to Personality* and *Approaches to Motivation*.

**Proposed decision:** CROSS-LINK rather than automatically merge. The personality application and motivational account may legitimately differ. Compare objectives and explanations, retaining distinct treatment only when the learner is answering a different question.

### 7. Humanistic Approach — Unit 7
**Current duplication:** Appears under *Approaches to Personality* and *Approaches to Motivation*.

**Proposed decision:** Same rule as above: canonical theory foundation with separate personality and motivation applications when they teach distinct concepts. Do not make the learner reread identical definitions.

### 8. Cognitive Dissonance — Unit 8
**Current duplication:** Appears under *Theoretical Perspectives in Social Psychology* and *Social Perception, Attitudes and Prosocial Behaviour*.

**Proposed decision:** Keep the theory and mechanism in the theoretical-perspectives location; CROSS-LINK to attitude change with an applied example if that lesson has a distinct objective. Do not remove the application merely because the concept name repeats.

### 9. Kohlberg's Moral Development — Units 7 and 9
**Current duplication:** Appears under Unit 7's personality/motivation/emotion/stress unit and Unit 9's development unit, with moral development also present as a broader developmental domain.

**Proposed decision:** Unit 9 is the likely canonical home for the developmental theory. Review the Unit 7 entry against the official syllabus and its actual lesson objective before relocation; if it has no distinct role, replace it with a cross-link after checking ID references.

### 10. Heuristics — Unit 6 (same-unit conceptual overlap)
**Current overlap:** *Problem Solving and Decision Making → Heuristics* and *Decision Making → Heuristics and biases*.

**Proposed decision:** Avoid duplicate introductory definitions. Teach the general concept in one canonical chunk; use the other location for named biases or decision-context applications only if they add distinct learning value. This is a near-duplicate candidate even though the titles are not identical.

### 11. Observational Learning — Units 5, 7 and 8 (conceptual overlap)
**Current overlap:** Unit 5 has *Observational learning* and its stages; Unit 7 has *Social learning approach* under personality; Unit 8 has *Social learning approach to aggression*.

**Proposed decision:** Do not merge these into one lesson. Use Unit 5 for the learning mechanism and sequence, Unit 7 for the personality framework, and Unit 8 for aggression application. Link back to the canonical mechanism and remove only repeated generic explanation.

## Learning-chunk decisions: when to keep, split or expand

A heading is not a chunk merely because it has its own ID. Inspect its actual explanation and practice before assigning a final decision.

- **Keep:** one coherent objective with enough explanation, examples, recall and application.
- **Expand:** a label such as a researcher name or broad area has too little content to teach the examinable concept.
- **Split:** several independent objectives are bundled and each can be retrieved/applied meaningfully.
- **Merge:** two entries teach the same objective and explanation without a distinct contextual purpose.
- **Cross-link:** the same concept is useful in different contexts, but one canonical explanation can prevent needless repetition.
- **Relocate:** parent topic is conceptually wrong or misleading.
- **Add:** verified question/lesson analysis reveals a genuinely missing concept or prerequisite.
- **Content review needed:** title-only evidence is not enough.

## Implementation order

1. Inspect the existing detailed explanation, deep-dive, recall, revision and practice content for each flagged chunk.
2. Inspect individual PYQ stems/options and available answer/source metadata. Map only what the question actually tests.
3. Record a decision and rationale for every one of the 549 entries. Uncertain entries remain explicitly unresolved.
4. Draft the minimal content/index changes with stable IDs and a migration map for any unavoidable ID change.
5. Validate that every question reference, micro-topic link, bookmark, progress record and revision route still resolves.
6. Run JSON/schema checks and learner-flow tests.
7. Present the implementation PR for review; do not merge until approved.

## Current completion boundary

This document and the crosswalk are a first-pass audit baseline. They do **not** claim that all 549 lesson bodies have been inspected or that all PYQ questions have been individually verified. Final structural edits require that deeper inspection. The 10-unit outline remains unchanged.
