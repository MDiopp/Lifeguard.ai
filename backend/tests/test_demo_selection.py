from __future__ import annotations

import unittest

from backend.demo import select_demo_videos
from backend.metadata import load_video_metadata


class FirstChoice:
    def choice(self, values):
        return values[0]


class DemoSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.metadata = load_video_metadata()

    def test_previous_clips_are_excluded_when_alternatives_exist(self) -> None:
        easy, hard = select_demo_videos(
            self.metadata,
            excluded_video_ids={"easy_01", "hard_01"},
            random_source=FirstChoice(),
        )
        self.assertEqual(easy.video_id, "easy_02")
        self.assertEqual(hard.video_id, "hard_02")

    def test_selection_always_returns_easy_then_hard(self) -> None:
        easy, hard = select_demo_videos(
            self.metadata,
            random_source=FirstChoice(),
        )
        self.assertEqual(easy.difficulty.value, "easy")
        self.assertEqual(hard.difficulty.value, "hard")


if __name__ == "__main__":
    unittest.main()
