"""Regression tests for Gemini structured-output schema compatibility."""
import unittest
from scripts.source_to_content import _gemini_schema


class GeminiSchemaTests(unittest.TestCase):
    def test_converts_types_and_omits_unsupported_additional_properties(self):
        source = {
            "type": "object",
            "properties": {
                "mappings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}},
                        "required": ["id"],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["mappings"],
            "additionalProperties": False,
        }
        result = _gemini_schema(source)
        self.assertEqual(result["type"], "OBJECT")
        self.assertEqual(result["properties"]["mappings"]["type"], "ARRAY")
        self.assertEqual(result["properties"]["mappings"]["items"]["type"], "OBJECT")
        self.assertNotIn("additionalProperties", result)
        self.assertNotIn("additionalProperties", result["properties"]["mappings"]["items"])
        self.assertEqual(result["properties"]["mappings"]["items"]["required"], ["id"])


if __name__ == "__main__":
    unittest.main()
