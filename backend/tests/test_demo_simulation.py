from __future__ import annotations

import unittest

from backend.demo import RoundAlreadySubmittedError, SimulatedDemoService
from backend.metadata import load_video_metadata


class FixedRandom:
    def __init__(self, value: int) -> None:
        self.value = value
        self.bounds: tuple[int, int] | None = None

    def randint(self, lower: int, upper: int) -> int:
        self.bounds = (lower, upper)
        return min(upper, max(lower, self.value))


class FixedVerifier:
    def __init__(self, result: bool) -> None:
        self.result = result

    def verify(self, submitted: str, *, reference_description: str, reference_location: str | None) -> bool:
        return self.result


class SimulatedDemoServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.metadata = load_video_metadata()

    def test_easy_and_hard_ranges_use_inclusive_hundredths(self) -> None:
        easy_random = FixedRandom(1237)
        hard_random = FixedRandom(1999)
        easy = SimulatedDemoService(self.metadata, random_source=easy_random).start_round("easy_01")
        hard = SimulatedDemoService(self.metadata, random_source=hard_random).start_round("hard_01")
        self.assertEqual(easy_random.bounds, (1200, 1400))
        self.assertEqual(hard_random.bounds, (1800, 2000))
        self.assertEqual(easy.ai_answer_time, 12.37)
        self.assertEqual(hard.ai_answer_time, 19.99)

    def test_human_time_and_verdict_are_recorded_once(self) -> None:
        service = SimulatedDemoService(self.metadata, random_source=FixedRandom(1300))
        round_state = service.start_round("easy_01")
        submission = service.submit_human_answer(
            round_state.round_id,
            answer="the girl wearing pink",
            started_at=8.126,
            verifier=FixedVerifier(True),
        )
        self.assertTrue(submission.correct)
        self.assertEqual(submission.started_at, 8.13)
        self.assertEqual(round_state.human_submission, submission)
        with self.assertRaises(RoundAlreadySubmittedError):
            service.submit_human_answer(
                round_state.round_id,
                answer="another person",
                started_at=9.0,
                verifier=FixedVerifier(False),
            )

    def test_incorrect_human_phrase_does_not_change_the_ai_answer(self) -> None:
        service = SimulatedDemoService(self.metadata, random_source=FixedRandom(1850))
        round_state = service.start_round("hard_01")
        submission = service.submit_human_answer(
            round_state.round_id,
            answer="person next to the purple float",
            started_at=16.0,
            verifier=FixedVerifier(False),
        )
        self.assertFalse(submission.correct)
        self.assertEqual(round_state.ai_answer_time, 18.5)
        self.assertEqual(round_state.target.description, "White girl")


if __name__ == "__main__":
    unittest.main()
