from __future__ import annotations

from random import SystemRandom
from typing import Protocol, Sequence, TypeVar

from backend.metadata import Difficulty, VideoMetadata, VideoMetadataRepository


T = TypeVar("T")


class ChoiceRandom(Protocol):
    def choice(self, values: Sequence[T]) -> T: ...


def select_demo_videos(
    repository: VideoMetadataRepository,
    *,
    excluded_video_ids: set[str] | frozenset[str] | None = None,
    random_source: ChoiceRandom | None = None,
) -> tuple[VideoMetadata, VideoMetadata]:
    """Choose one clip per difficulty, preferring clips outside the last demo."""
    excluded = excluded_video_ids or set()
    chooser = random_source or SystemRandom()
    selected: list[VideoMetadata] = []

    for difficulty in (Difficulty.EASY, Difficulty.HARD):
        available = repository.get_by_difficulty(difficulty)
        if not available:
            raise RuntimeError(f"no {difficulty.value} demo videos are configured")
        preferred = tuple(
            video for video in available if video.video_id not in excluded
        )
        selected.append(chooser.choice(preferred or available))

    return selected[0], selected[1]
