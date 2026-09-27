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
        easy_random = FixedRandom(1537)
        hard_random = FixedRandom(2699)
        easy = SimulatedDemoService(self.metadata, random_source=easy_random).start_round("easy_01")
        hard = SimulatedDemoService(self.metadata, random_source=hard_random).start_round("hard_02")
        self.assertEqual(easy_random.bounds, (1400, 1600))
        self.assertEqual(hard_random.bounds, (2500, 2700))
        self.assertEqual(easy.ai_answer_time, 15.37)
        self.assertEqual(hard.ai_answer_time, 26.99)

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
        service = SimulatedDemoService(self.metadata, random_source=FixedRandom(2550))
        round_state = service.start_round("hard_02")
        submission = service.submit_human_answer(
            round_state.round_id,
            answer="person next to the purple float",
            started_at=16.0,
            verifier=FixedVerifier(False),
        )
        self.assertFalse(submission.correct)
        self.assertEqual(round_state.ai_answer_time, 25.5)
        self.assertEqual(round_state.target.description, "Big black boy")

    def test_configured_no_answer_has_no_time_and_cannot_win(self) -> None:
        random_source = FixedRandom(1900)
        service = SimulatedDemoService(self.metadata, random_source=random_source)
        round_state = service.start_round("hard_01")
        service.submit_human_answer(
            round_state.round_id,
            answer="girl in the middle left",
            started_at=19.0,
            verifier=FixedVerifier(True),
        )
        self.assertIsNone(round_state.ai_answer_time)
        self.assertIsNone(round_state.ai_answer)
        self.assertFalse(round_state.ai_answered)
        self.assertFalse(round_state.ai_correct)
        self.assertIsNone(random_source.bounds)
        self.assertEqual(round_state.winner(), "human")

    def test_deliberately_incorrect_ai_answer_cannot_win(self) -> None:
        service = SimulatedDemoService(self.metadata, random_source=FixedRandom(1100))
        round_state = service.start_round("hard_03")
        service.submit_human_answer(
            round_state.round_id,
            answer="black boy in the middle",
            started_at=15.0,
            verifier=FixedVerifier(True),
        )
        self.assertEqual(round_state.ai_answer, "White girl in middle")
        self.assertFalse(round_state.ai_correct)
        self.assertEqual(round_state.winner(), "human")


if __name__ == "__main__":
    unittest.main()
