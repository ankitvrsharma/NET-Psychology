# Content System

## Content sources

The site uses a supplied syllabus base plus Psychology study sources as a synthesis library. The purpose is to create learner-oriented explanations, notes, recall cues and exam practice rather than reproduce books verbatim.

## Content pools

The runtime registry provides a boundary between the application and content files. Enabled pools are loaded through configured paths.

The current application recognises canonical layers including:

- `microtopics`
- `quickLearn`
- `deepDive`
- `deepDiveEnrichment`
- `activeRecall`
- `revisionGuidance`
- `questions`
- `sourceSynthesis`

## Source synthesis

For a micro-topic, source synthesis can attach evidence/source identifiers, an integrated note and source policy. Existing source mappings can be combined with evidence-derived source identifiers.

The learner should receive a synthesized explanation, not an uncontrolled dump of source text.

## Provenance

Content should retain enough source information to answer:

- Where did this concept come from?
- Which source supports it?
- Is it a generated practice question or a PYQ?
- Has it passed the publication process?

## Publication

The current publication policy is:

**REWRITE → RE-AUDIT → PASS → PUBLISH**

Content that remains REVIEW or ISSUE is held unless an explicit owner approval exists.

The repository currently contains an owner-approved micro-topic override for `2-2-6`; this is a configuration fact, not a general rule that all content is owner-approved.

## Copyright boundary

The website should synthesise supplied books into original study explanations. Long verbatim reproduction of copyrighted source material should not be used as learner content.

## Content quality

A useful micro-topic explanation should be:

- psychologically specific;
- conceptually accurate;
- connected to mechanisms, distinctions or evidence where appropriate;
- useful for UGC NET;
- supported by source mapping;
- structured for retrieval and application;
- free from generic filler.
