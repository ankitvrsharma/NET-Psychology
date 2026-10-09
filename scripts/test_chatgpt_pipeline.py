"""Regression tests for repository-only ChatGPT-assisted content tasks."""
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import prepare_chatgpt_packet as packet
from scripts import import_chatgpt_response as importer

ROOT = Path(__file__).resolve().parents[1]


class ChatGPTPacketTests(unittest.TestCase):
    def test_evidence_is_ranked_and_page_markers_are_preserved(self):
        chunks = [
            ("sources/inbox/book.pdf", 0, "[PAGE 1]\nResearch means systematic inquiry."),
            ("sources/inbox/book.pdf", 1, "[PAGE 2]\nUnrelated visual perception content."),
            ("sources/inbox/notes.txt", 0, "Research aims to answer questions using evidence."),
        ]
        ref = {"id": "1-1-1", "title": "Research", "topic_title": "Research Methods", "unit_title": "Methods"}
        selected = packet.select_evidence(ref, chunks)
        self.assertGreaterEqual(len(selected), 2)
        self.assertIn("[PAGE 1]", selected[0]["text"])
        self.assertGreater(selected[0]["relevance_score"], 0)

    def test_packet_uses_complete_standing_instruction_file(self):
        instructions = json.loads((ROOT / "data/content-enrichment-instructions.json").read_text(encoding="utf-8"))
        self.assertTrue(instructions.get("enabled"))
        for key in ("website_philosophy", "source_use", "microtopic", "deep_dive", "active_recall", "revision", "practice", "cross_references", "verification"):
            self.assertTrue(instructions["modular_instructions"].get(key), key)

    def test_request_is_valid_json_and_workflow_has_no_model_secret(self):
        json.loads((ROOT / "data/content-generation-request.json").read_text(encoding="utf-8"))
        workflow = (ROOT / ".github/workflows/source-to-content.yml").read_text(encoding="utf-8")
        self.assertNotIn("GEMINI_API_KEY", workflow)
        self.assertNotIn("generateContent", workflow)
        self.assertIn("prepare_chatgpt_packet.py", workflow)
        self.assertIn("import_chatgpt_response.py", workflow)

    def test_markdown_packet_includes_prompt_and_source_manifest(self):
        packet_data = {
            "request": {"request_id": "test"},
            "operation": "unit_rewrite",
            "source_manifest": [{"path": "sources/inbox/example.pdf", "sha256": "abc"}],
            "topics": [{"canonical": {"id": "1-1-1"}}],
            "records": [],
            "chatgpt_prompt": "Apply every standing instruction and return valid JSON."
        }
        markdown = packet.make_markdown(packet_data)
        self.assertIn("Apply every standing instruction", markdown)
        self.assertIn("1-1-1", markdown)
        self.assertIn("sources/inbox/example.pdf", markdown)

    def test_repository_only_policy_is_valid_json(self):
        policy = json.loads((ROOT / "sources/source-policy.json").read_text(encoding="utf-8"))
        self.assertIn("repository", policy["source_truth_policy"].lower())
        instructions = json.loads((ROOT / "data/content-enrichment-instructions.json").read_text(encoding="utf-8"))
        self.assertIn("ONLY resources already present", instructions["modular_instructions"]["source_use"])

    def test_legacy_gemini_api_code_is_removed(self):
        source = (ROOT / "scripts/source_to_content.py").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/source-to-content.yml").read_text(encoding="utf-8")
        admin = (ROOT / "admin.js").read_text(encoding="utf-8")
        self.assertNotIn("GEMINI_API_KEY", source + workflow + admin)
        self.assertNotIn("generateContent", source + workflow + admin)
        self.assertNotIn("Gemini", admin)

    def test_pyq_update_cannot_rewrite_authentic_question(self):
        qstore = {"pyq": [{"id": "PYQ-1", "question": "Which theory explains learning?", "options": ["A", "B", "C", "D"], "answer": "A", "year": 2024, "explanation": "Old explanation."}]}
        with patch.object(importer.stc, "load", return_value=qstore):
            _, errors = importer.validate_record_updates(
                {"question_updates": [{"id": "PYQ-1", "updates": {"question": "Which theory best explains learning?", "explanation": "A detailed explanation grounded in repository source evidence, with a clear reason why the correct option fits the concept."}}]},
                "pyq_improvement", {})
        self.assertTrue(any("question wording may not change" in e for e in errors))

    def test_pyq_update_allows_whitespace_formatting_and_explanation(self):
        qstore = {"pyq": [{"id": "PYQ-1", "question": "Which theory explains learning?", "options": ["A", "B", "C", "D"], "answer": "A", "year": 2024, "explanation": "Old explanation."}]}
        with patch.object(importer.stc, "load", return_value=qstore):
            updates, errors = importer.validate_record_updates(
                {"question_updates": [{"id": "PYQ-1", "updates": {"question": "Which theory  explains learning?", "explanation": "A detailed explanation grounded in repository source evidence, with a clear reason why the correct option fits the concept."}}]},
                "pyq_improvement", {})
        self.assertFalse(errors)
        self.assertEqual(updates[0]["id"], "PYQ-1")

    def test_mcq_correct_answer_cannot_be_changed(self):
        qstore = {"practice": [{"id": "MCQ-1", "question": "Which theory explains learning?", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Old explanation."}]}
        with patch.object(importer.stc, "load", return_value=qstore):
            _, errors = importer.validate_record_updates(
                {"question_updates": [{"id": "MCQ-1", "updates": {"correct_answer": "B", "explanation": "A detailed explanation grounded in repository source evidence, with a clear reason why the correct option fits the concept."}}]},
                "mcq_improvement", {})
        self.assertTrue(any("cannot update question field correct_answer" in e for e in errors))

    def test_admin_exposes_all_requested_content_operations(self):
        admin = (ROOT / "admin.js").read_text(encoding="utf-8")
        for operation in ("unit_rewrite", "quick_cards_rewrite", "mcq_improvement", "pyq_improvement"):
            self.assertIn(operation, admin)


if __name__ == "__main__":
    unittest.main()
