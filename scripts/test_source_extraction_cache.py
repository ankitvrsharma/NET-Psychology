"""Regression tests for persistent source extraction caching."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import source_to_content


class SourceExtractionCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix=".source-cache-test-", dir=source_to_content.ROOT)
        self.root = Path(self.temp.name)
        self.inbox = self.root / "inbox"
        self.cache = self.root / "cache"
        self.inbox.mkdir()
        self.source = self.inbox / "notes.txt"
        self.source.write_text("first source version", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_reuses_extraction_until_source_bytes_change(self):
        with patch.object(source_to_content, "extract", side_effect=["extracted first", "extracted second"]) as extract:
            first_chunks, first_meta, first_stats = source_to_content.load_source_library(self.inbox, self.cache)
            second_chunks, second_meta, second_stats = source_to_content.load_source_library(self.inbox, self.cache)

            self.assertEqual(first_chunks[0][2], "extracted first")
            self.assertEqual(first_meta[0]["extraction_cache"], "miss")
            self.assertEqual(second_chunks[0][2], "extracted first")
            self.assertEqual(second_meta[0]["extraction_cache"], "hit")
            self.assertEqual(first_stats["cache_misses"], 1)
            self.assertEqual(second_stats["cache_hits"], 1)
            self.assertEqual(extract.call_count, 1)

            self.source.write_text("changed source version", encoding="utf-8")
            third_chunks, third_meta, third_stats = source_to_content.load_source_library(self.inbox, self.cache)
            self.assertEqual(third_chunks[0][2], "extracted second")
            self.assertEqual(third_meta[0]["extraction_cache"], "miss")
            self.assertEqual(third_stats["cache_misses"], 1)
            self.assertEqual(extract.call_count, 2)

    def test_deleted_source_cache_is_removed(self):
        with patch.object(source_to_content, "extract", return_value="cached text"):
            source_to_content.load_source_library(self.inbox, self.cache)
        self.assertTrue(list(self.cache.glob("*.json")))

        self.source.unlink()
        chunks, metadata, stats = source_to_content.load_source_library(self.inbox, self.cache)
        self.assertEqual(chunks, [])
        self.assertEqual(metadata, [])
        self.assertEqual(stats["files"], 0)
        self.assertEqual(list(self.cache.glob("*.json")), [])


if __name__ == "__main__":
    unittest.main()
