from __future__ import annotations

import unittest

from backend.monitor import BoundingBox, MovementRiskTracker


class MovementRiskTrackerTests(unittest.TestCase):
    def test_quiet_jitter_stays_green(self) -> None:
        tracker = MovementRiskTracker()
        observation = None
        for index in range(120):
            x = 100 + (index % 2)
            observation = tracker.observe(
                1,
                BoundingBox(x, 100, x + 100, 300),
                timestamp=index / 10,
                frame_width=1280,
                frame_height=720,
            )
        assert observation is not None
        self.assertLess(observation.risk, 0.1)

    def test_sustained_erratic_movement_reaches_red_in_about_ten_seconds(self) -> None:
        tracker = MovementRiskTracker()
        observation = None
        for index in range(111):
            x = 180 if index % 2 else 80
            observation = tracker.observe(
                7,
                BoundingBox(x, 100, x + 100, 300),
                timestamp=index / 10,
                frame_width=1280,
                frame_height=720,
            )
        assert observation is not None
        self.assertGreaterEqual(observation.risk, 0.9)

    def test_risk_decays_and_stale_tracks_are_removed(self) -> None:
        tracker = MovementRiskTracker()
        for index in range(70):
            x = 180 if index % 2 else 80
            tracker.observe(3, BoundingBox(x, 100, x + 100, 300), timestamp=index / 10, frame_width=1280, frame_height=720)
        before = tracker.observe(3, BoundingBox(80, 100, 180, 300), timestamp=7.0, frame_width=1280, frame_height=720)
        after = before
        for index in range(1, 61):
            after = tracker.observe(3, BoundingBox(80, 100, 180, 300), timestamp=7.0 + index / 10, frame_width=1280, frame_height=720)
        self.assertLess(after.risk, before.risk)
        tracker.remove_stale(timestamp=15.0, active_ids=set())
        self.assertFalse(tracker.has_track(3))


if __name__ == "__main__":
    unittest.main()
