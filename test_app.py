"""
Gemini SmartNotes - Automated Test Suite
Verifies API endpoints, security, fallbacks, and PDF generation.
"""

import os
import unittest
from fastapi.testclient import TestClient
from main import app
from ai_functions import (
    ai_topic_explanation,
    ai_generate_mcq,
    ai_generate_qa,
    ai_generate_summary,
    create_pdf,
    parse_mcq_text
)

class TestGeminiSmartNotes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_status(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("has_api_key", data)
        self.assertIn("engine", data)

    def test_explain_endpoint(self):
        res = self.client.post("/explain", json={
            "topic": "Binary Search",
            "difficulty": "intermediate"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["topic"], "Binary Search")
        self.assertTrue(len(data["explanation"]) > 50)

    def test_mcq_endpoint(self):
        res = self.client.post("/mcq", json={
            "topic": "Binary Search",
            "count": 3,
            "difficulty": "intermediate"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("mcqs", data)
        self.assertIn("parsed", data)
        self.assertTrue(len(data["parsed"]) >= 1)

    def test_qa_endpoint(self):
        res = self.client.post("/qa", json={
            "topic": "Binary Search",
            "difficulty": "intermediate"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("qa", data)
        self.assertIn("summary", data)
        self.assertTrue(len(data["qa"]) >= 1)

    def test_summary_endpoint(self):
        res = self.client.post("/summary", json={
            "topic": "Binary Search",
            "difficulty": "intermediate"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("summary", data)
        self.assertTrue(len(data["summary"]) > 20)

    def test_pdf_generation(self):
        res = self.client.post("/pdf", json={
            "topic": "Binary Search Algorithm",
            "difficulty": "intermediate",
            "mcq_count": 3
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertTrue(len(res.content) > 1000)

    def test_custom_api_key_header_support(self):
        # Test passing custom key header
        res = self.client.get("/api/status", headers={"x-gemini-api-key": "test_dummy_key"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["has_api_key"])

    def test_mcq_parser_robustness(self):
        sample_text = (
            "**Q1.** What is the time complexity of binary search?\n"
            "A. O(N)\n"
            "B. O(log N)\n"
            "C. O(N^2)\n"
            "D. O(1)\n"
            "Answer: B\n"
            "Explanation: Halves the search space each iteration.\n"
        )
        parsed = parse_mcq_text(sample_text)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["correct"], 1)
        self.assertEqual(len(parsed[0]["options"]), 4)

if __name__ == "__main__":
    unittest.main()
