# PYQ recovery and content preservation

## Scope and current limitation

This repository contains several content pools that must be preserved independently: canonical micro-topics, Quick Learn, Deep Dive, Active Recall, Revision, Practice, the question bank, syllabus mappings, and official NTA asset registry. A source upload or a successful extraction does not by itself publish learner-facing content.

The existing question bank must be read and backed up from a verified checkout before it is edited. A connector returning an empty response for a large file is not evidence that the file is empty. Never replace a pool based on a failed or truncated read.

## PYQ provenance

- `official_paper_matched`: question text and exam session independently matched to an official paper.
- `book_compilation_identified_as_pyq`: the cited source itself identifies the item as a UGC NET Psychology PYQ.
- `session_status`: record whether the exact exam session is known; do not infer it from a topic or a similar question.
- `answer_status`: track official final-key match separately from source attribution. Do not score a question until its answer is adequately verified.
- General textbook coverage of a concept is not, by itself, evidence that a question appeared in UGC NET.

## Recovery workflow

1. Create a byte-verified backup and manifest before modifying any existing pool.
2. Inventory every source that explicitly contains papers or identifies questions as PYQs, including RevisaThon, Power Within, Trueman's, and separate question-paper collections.
3. Extract complete stems and options with source/page references. Retain OCR uncertainty and do not silently reconstruct missing text.
4. Deduplicate against the existing question bank, preserving multiple source references where appropriate.
5. Match exam sessions and official final answer keys only when the identifiers and question text support the match.
6. Keep incomplete candidates in review staging; only publish records meeting the live schema and answer-verification rules.
7. Run content integrity, reduction-guard, and frontend tests before merging.

## Backups

A scheduled/manual GitHub Actions workflow snapshots the canonical JSON pools with a SHA-256 manifest and retains each artifact for 90 days. Git history remains the primary durable version history; download important snapshots for independent retention. The reduction guard flags large unexpected JSON record-count drops during pull requests. Review any intentional deletions with an explicit explanation rather than bypassing the guard silently.
