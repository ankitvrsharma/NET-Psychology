"""Regression tests for the no-API ChatGPT-assisted content pipeline."""
import json
import unittest
from pathlib import Path

from scripts import prepare_chatgpt_packet as packet

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

    def test_request_is_valid_json_and_workflow_has_no_gemini_secret(self):
        json.loads((ROOT / "data/content-generation-request.json").read_text(encoding="utf-8"))
        workflow = (ROOT / ".github/workflows/source-to-content.yml").read_text(encoding="utf-8")
        self.assertNotIn("GEMINI_API_KEY", workflow)
        self.assertNotIn("generateContent", workflow)
        self.assertIn("prepare_chatgpt_packet.py", workflow)
        self.assertIn("import_chatgpt_response.py", workflow)

    def test_markdown_packet_exposes_the_prompt_for_any_chat(self):
        packet_data = {
            "request": {"request_id": "test"},
            "topics": [{"canonical": {"id": "1-1-1"}}],
            "chatgpt_prompt": "Apply every standing instruction and return valid JSON."
        }
        markdown = packet.make_markdown(packet_data)
        self.assertIn("Apply every standing instruction", markdown)
        self.assertIn("1-1-1", markdown)


if __name__ == "__main__":
    unittest.main()
