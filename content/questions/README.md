# Website question pool

The website keeps authentic previous-year questions (PYQs) and authored practice MCQs in separate collections in `questions.json`.

## Authoritative PYQ inventory

`telegram-quiz/data/question_bank.xlsx` is the single authoritative verified PYQ inventory designated by the site owner. The website importer reads the existing workbook directly; it does not create or replace another workbook.

Run from the repository root:

```bash
python -m pip install openpyxl==3.1.5
python scripts/import_verified_pyqs.py
python scripts/validate_content.py
```

The importer:
- Preserves the workbook's session, paper, question number, stem, four options, answer key, shared passage/list content and source page.
- Reuses existing question-specific overrides in `data/mcq_mapping.json` before conservative syllabus-title matching.
- Maps only when there is sufficient evidence; uncertain items remain in the PYQ pool without a syllabus assignment and are counted in `data/pyq-import-audit.json`.
- Keeps non-standard or unresolved answer-key rows under the non-runtime `review` collection. They are not served as answerable questions until reviewed.
- Merges existing website PYQs and preserves the separate `practice` collection. Existing website-authored explanations and mappings are retained when available.
- Does not invent explanations. When the workbook has no rationale, the question explicitly directs learners to the mapped micro-topic learning notes.

The PR workflow `.github/workflows/import-verified-pyqs.yml` runs the importer and validator on the same-repository PR branch when the workbook or importer inputs change.

## Provenance and answer keys

The workbook is treated as the authoritative inventory because the site owner has designated it as verified. This designation is not a claim that this importer independently rechecked every question and answer against NTA's final answer-key PDFs. The source workbook remains unchanged.
