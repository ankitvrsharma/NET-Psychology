# Learning-chunk and PYQ crosswalk audit

**Status:** Structural audit proposal; no syllabus outline or learner data changed by this document.  
**Invariant:** Preserve the current 10 units and their existing outline.  
**Current hierarchy:** 10 units, 118 topics, 549 micro-topic entries in `data/syllabus-index.json`.

## Purpose

Determine whether each micro-topic is a natural, useful learning chunk rather than a mechanically generated heading. Use three sources of evidence together:

1. **Conceptual structure:** the discipline's own conceptual relationships and prerequisites.
2. **Authentic PYQs:** question stems, options, answer keys, years and source identifiers where available in the uploaded REVISATHON through Last 5 Years PYQ compilations and repository question bank.
3. **Learning function:** whether a chunk supports understanding, retrieval, discrimination, application and spaced revision.

PYQ frequency is evidence of exam relevance, not the sole criterion for chunk boundaries. A frequently tested concept may remain within a larger coherent lesson; a foundational but less frequently represented concept should not be removed just because it has fewer matches.

## PYQ evidence available for the audit

The uploaded REVISATHON collection contains topic-led material with headings including **Stages of Retirement, Values, Glass Ceiling, Metacognition, Theories of Emotion, Levels of Data, Standardized Scores, Classical vs Operant Conditioning, Item Difficulty, Semantic Differential, Signal Detection, Depth Perception, Kohlberg, Social Loafing, Social Facilitation, Sampling, Observation,** and **Factorial/experimental-design concepts**.

These headings are useful starting points for locating relevant chunks in the 10-unit hierarchy. They are not, by themselves, proof of a specific examination year or official answer. During content-level mapping, preserve the wording and source metadata available in each source; do not infer missing year, session, question number or answer key. Keep authentic PYQs separate from newly authored practice MCQs.

## Audit criteria for every micro-topic

Assign one of these decisions only after checking the lesson content and linked questions:

- **KEEP:** a coherent concept/process/theory/comparison with a clear learning outcome.
- **EXPAND:** a broad label that hides several distinct examinable ideas, or content too thin to support understanding and application.
- **SPLIT:** multiple independent learning objectives have been bundled together and can each support meaningful retrieval.
- **MERGE:** entries teach substantially the same concept with no distinct learning purpose.
- **CROSS-LINK:** the concept legitimately belongs in multiple contexts, but one canonical explanation should be reused with a distinct contextual application.
- **RELOCATE:** the concept's current parent topic does not represent its conceptual relationship.
- **ADD:** source-supported PYQs expose a missing prerequisite, distinction, mechanism or application that deserves a coherent chunk.
- **CONTENT REVIEW NEEDED:** titles alone are insufficient to decide; inspect notes, detailed explanation and question mapping before editing.

For each decision, record a rationale, proposed learning objective, parent topic, prerequisite/next-step links, PYQ references, source confidence and migration impact. Do not renumber or delete IDs casually: existing progress, bookmarks, revision scheduling and content packages may depend on them.

## Initial structural findings and proposed treatment

These are high-confidence **review candidates** based on the current index titles. They are proposals, not blanket permission to delete material.

### Unit 1 — Emergence of Psychology
- **Buddhism, Sufism and Integral Yoga** appear under both *Eastern Psychological Thought* and *Indian Paradigms of Psychological Knowledge*. Review for a canonical explanation plus separate historical/epistemological application, rather than duplicate lessons.
- **Wundt, Freud, James and Dilthey** are person-name chunks. Ensure each lesson teaches the person's defining contribution, method/assumptions and contrasts—not biography alone.
- **Ontology, epistemology and methodology** are valid related chunks if their distinctions and relationship are explicitly taught.

### Unit 2 — Research Methodology and Statistics
- *Research Problems, Variables, Hypotheses and Sampling* groups several major ideas. Its child chunks are often defensible, but the topic should be a clearly sequenced learning pathway rather than a single catch-all lesson.
- *Power Analysis* and *Effect Size* can remain individual chunks only if the learner can interpret the concepts, their relationship, and a basic research scenario.
- *Factor Analysis* currently includes **Main effects and interaction** and **Post-hoc comparisons**, which are also listed under *ANOVA*. Check whether these are mis-parented. Their primary home is likely experimental/statistical analysis; cross-link only where the context genuinely warrants it.
- *Experimental Designs* begins at micro-topic IDs 4–11, while IDs 1–3 are absent in the visible index. Investigate history/schema expectations before adding or renumbering anything; gaps may be intentional or may indicate missing content.
- PYQs on **levels of data, sampling, standardized scores,** and **factorial/experimental-design concepts** should be mapped to the exact skill tested (definition, selection, calculation, interpretation or design recognition).

### Unit 3 — Psychological Testing
- *Types of Tests* and several named instruments can become memorisation-only chunks unless each has a clear distinguishing feature, purpose, interpretation boundary and comparison.
- Keep **item writing** and **item analysis** distinct if the learning outcomes differ. Use the PYQ topic **Item Difficulty** to check that item difficulty and related item-analysis concepts are taught and practised.
- Map **Semantic Differential** to the attitude-scale chunk; preserve the authentic question and its options, then add a separate explanation rather than rewriting the PYQ.

### Unit 4 — Biological Basis of Behavior
- **Neuroplasticity** appears as a standalone topic and as a child under *Central and Peripheral Nervous Systems*. Prefer one canonical explanation with a system-level cross-link if both placements currently repeat the same lesson.
- **Neurotransmitters** is a legitimate topic, but its chunking should support transmitter/function distinctions and avoid an unstructured list.
- Link physiology PYQs to the exact anatomical structure, method, mechanism or function tested; don't map every question about the brain to a generic “nervous system” chunk.

### Unit 5 — Attention, Perception, Learning, Memory and Forgetting
- **Perception** is broad as a single micro-topic. Check whether it functions as an introductory overview; detailed mechanisms should be taught in the specialised child topics already present.
- The PYQ topics **Signal Detection, Depth Perception, Classical vs Operant Conditioning,** and **Law of Comparison/related learning principles** should connect to focused lessons and contrast practice.
- Maintain the difference between a process, a theory, a phenomenon and a model. For example, acquisition, extinction, spontaneous recovery, generalisation and discrimination are related but not interchangeable; retain separate chunks when each supports a distinct learning outcome.
- The memory hierarchy should distinguish process (encoding/storage/retrieval), system (working/long-term memory) and explanatory model.

### Unit 6 — Thinking, Intelligence and Creativity
- **Language and Thought** is a broad label; establish whether it is an overview or contains distinct theories, evidence and language-cognition relationships.
- Heuristics appear in problem solving and decision making. Use a canonical explanation for the general mechanism, with separate applications/decision biases only where the learning goal differs.
- Researcher-name chunks under intelligence and creativity must compare theories on their defining structure, not just attach a name to a paragraph.
- Link the PYQ heading **Metacognition** to metacognitive knowledge and regulation; ensure learners practise differentiating what they know from how they monitor/control learning.

### Unit 7 — Personality, Motivation, Emotion, Stress and Coping
- Psychoanalytical and humanistic approaches occur in personality and motivation. This can be justified because the same tradition addresses different questions; avoid copying the same overview into both lessons.
- The emotion theories already have separate entries. Use PYQs headed **Theories of Emotion** to create contrastive retrieval (sequence of events, role of arousal/cognition, and distinguishing predictions).
- Stress and coping should connect concepts, models, appraisal and coping strategies in a sequence without collapsing distinct theoretical models into one generic chunk.

### Unit 8 — Social Psychology
- **Persuasion** appears under social perception/attitudes and groups/social influence. Keep the attitude-change mechanism connected to its application in social influence; avoid duplicate definitions.
- **Social Facilitation** and **Social Loafing** are separate, contrastable learning chunks. Link them through a deliberate comparison, not a merge.
- Distinguish theories of intergroup relations from individual attribution/attitude mechanisms. Link PYQs by the mechanism actually tested.

### Unit 9 — Human Development and Interventions
- **Kohlberg's moral development** appears under developmental theories and as a separate topic in Unit 7. Review the Unit 7 placement for syllabus justification; retain contextual links only if it serves a distinct role there.
- Psychopathology and psychotherapy are large domains. Chunking should be based on diagnostic families, defining distinctions, therapy mechanisms and applications—not arbitrary short headings.
- Counselling process, counselling skills, counselling techniques and basic skills of listening/questioning/empathy overlap. Check for a clear progression and avoid repeating the same skills lesson under multiple headings.
- PYQs on **Stages of Retirement** should map to successful aging/development where the exact question content supports that placement.

### Unit 10 — Emerging Areas
- Several topic pairs repeat a broad concept and its application: **gender/gender inequality**, **poverty/poverty and discrimination**, **disability/disability and discrimination**, **migration/migration consequences**; similarly **violence/non-violence** and **macro-level conflict resolution/media and conflict resolution**.
- These may be useful concept → consequence/application sequences, but the distinction must be explicit. If two lessons have the same objective and explanation, consolidate to a canonical chunk with separate applied examples.
- Wellbeing should distinguish hedonic and eudaimonic wellbeing while using one comparison chunk to connect them, rather than duplicate definitions.
- Health content should distinguish broad health behaviour, specific chronic diseases, and psychoneuroimmunology by their learning objectives.

## Required PYQ mapping record

For each authentic question, retain a record with:
- original question text and options;
- official/source-provided answer and explanation, where available;
- source filename and page/topic heading;
- exam/year/session/question number only when the source explicitly provides it;
- canonical unit/topic/micro-topic ID(s);
- primary learning objective tested (recognition, discrimination, recall, calculation, interpretation, application or sequence);
- confidence of mapping and any unresolved ambiguity.

A question may support more than one chunk when it genuinely tests multiple objectives. Use one primary mapping and optional secondary links to avoid inflating coverage counts. Do not count generated MCQs as PYQ evidence.

## Implementation safeguards

1. Keep the existing 10-unit outline exactly as it is.
2. Do not modify content IDs, delete entries or migrate learner progress until references across the website have been checked.
3. Preserve authentic PYQ wording, options, source attribution and answer data.
4. Separate source-grounded claims from editorial inference and newly generated practice.
5. Audit learner-facing explanations and question links, not just the index titles.
6. Validate all referenced IDs, links, JSON schemas, question counts and learning/revision routes.
7. Use a separate pull request and obtain approval before merging structural changes.

## Completion standard

The audit is complete only when every existing micro-topic has a recorded decision (including **CONTENT REVIEW NEEDED** where content evidence is missing), every available authentic PYQ has a traceable mapping or an explicit unresolved status, and all proposed splits/merges/additions preserve the 10-unit outline and existing learner records.
