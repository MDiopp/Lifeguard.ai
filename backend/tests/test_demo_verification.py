from __future__ import annotations

import unittest

from backend.demo import (
    AnswerVerificationUnavailable,
    GeminiFirstAnswerVerifier,
    LocalAnswerVerifier,
)


class StubVerifier:
    def __init__(self, result: bool | Exception) -> None:
        self.result = result
        self.calls = 0

    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool:
        self.calls += 1
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


class AnswerVerificationTests(unittest.TestCase):
    def test_gemini_result_is_used_without_calling_the_fallback(self) -> None:
        primary = StubVerifier(False)
        fallback = StubVerifier(True)
        verifier = GeminiFirstAnswerVerifier(primary, fallback)

        result = verifier.verify(
            "girl middle right",
            reference_description="Black girl in pink suit",
            reference_location="middle-right",
        )

        self.assertFalse(result)
        self.assertEqual(primary.calls, 1)
        self.assertEqual(fallback.calls, 0)

    def test_local_checker_runs_only_when_gemini_is_unavailable(self) -> None:
        primary = StubVerifier(AnswerVerificationUnavailable("quota exceeded"))
        fallback = StubVerifier(True)
        verifier = GeminiFirstAnswerVerifier(primary, fallback)

        result = verifier.verify(
            "girl middle right",
            reference_description="Black girl in pink suit",
            reference_location="middle-right",
        )

        self.assertTrue(result)
        self.assertEqual(primary.calls, 1)
        self.assertEqual(fallback.calls, 1)

    def test_local_checker_requires_a_descriptor_and_compatible_location(self) -> None:
        verifier = LocalAnswerVerifier()
        reference = {
            "reference_description": "Black girl in pink suit",
            "reference_location": "middle-right",
        }

        self.assertTrue(verifier.verify("girl middle right", **reference))
        self.assertTrue(verifier.verify("pink suit right", **reference))
        self.assertFalse(verifier.verify("girl", **reference))
        self.assertFalse(verifier.verify("person middle right", **reference))
        self.assertFalse(verifier.verify("girl middle left", **reference))
        self.assertFalse(verifier.verify("boy middle right", **reference))
        self.assertFalse(verifier.verify("girl in blue middle right", **reference))


if __name__ == "__main__":
    unittest.main()
