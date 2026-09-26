"""JSON repository for validated local demo-video metadata."""

from __future__ import annotations

from json import JSONDecodeError, load
from pathlib import Path, PurePosixPath
from types import MappingProxyType
from typing import Any, Protocol, runtime_checkable

from .models import (
    DemoConfig,
    Difficulty,
    DuplicateIdError,
    MetadataValidationError,
    VideoMetadata,
)


class ConfigFileNotFoundError(FileNotFoundError):
    """Raised when demo_config.json does not exist."""


class MalformedConfigError(ValueError):
    """Raised when demo_config.json is not valid JSON."""


class VideoFileNotFoundError(FileNotFoundError):
    """Raised when metadata references a missing local video."""


class VideoNotFoundError(LookupError):
    """Raised when a requested video ID is not present."""


@runtime_checkable
class VideoMetadataRepository(Protocol):
    """Storage-neutral metadata access used by future backend services."""

    def get_all(self) -> tuple[VideoMetadata, ...]: ...

    def get_by_difficulty(
        self, difficulty: Difficulty | str
    ) -> tuple[VideoMetadata, ...]: ...

    def get_by_id(self, video_id: str) -> VideoMetadata: ...


def _object_without_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateIdError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


class JsonVideoMetadataRepository:
    """Load and query validated metadata from one local JSON config file."""

    def __init__(
        self,
        config_path: str | Path,
        *,
        project_root: str | Path | None = None,
    ) -> None:
        self.config_path = Path(config_path).resolve()
        self.project_root = (
            Path(project_root).resolve()
            if project_root is not None
            else self.config_path.parent
        )
        config = self._load()
        self._videos = config.videos
        self._videos_by_id = MappingProxyType(
            {video.video_id: video for video in self._videos}
        )

    def _load(self) -> DemoConfig:
        try:
            with self.config_path.open("r", encoding="utf-8") as config_file:
                raw_config = load(
                    config_file, object_pairs_hook=_object_without_duplicate_keys
                )
        except FileNotFoundError as error:
            raise ConfigFileNotFoundError(
                f"demo metadata config not found: {self.config_path}"
            ) from error
        except JSONDecodeError as error:
            raise MalformedConfigError(
                f"malformed JSON in {self.config_path} at line "
                f"{error.lineno}, column {error.colno}: {error.msg}"
            ) from error

        config = DemoConfig.from_mapping(raw_config)
        for video in config.videos:
            self._validate_video_file(video)
        return config

    def _validate_video_file(self, video: VideoMetadata) -> None:
        relative = PurePosixPath(video.relative_path)
        if relative.is_absolute() or ".." in relative.parts:
            raise MetadataValidationError(
                f"{video.video_id}.relative_path must stay within the project root"
            )
        candidate = (self.project_root / Path(*relative.parts)).resolve()
        try:
            candidate.relative_to(self.project_root)
        except ValueError as error:
            raise MetadataValidationError(
                f"{video.video_id}.relative_path resolves outside the project root"
            ) from error
        if not candidate.is_file():
            raise VideoFileNotFoundError(
                f"video file referenced by {video.video_id!r} was not found: {candidate}"
            )

    def get_all(self) -> tuple[VideoMetadata, ...]:
        return self._videos

    def get_by_difficulty(
        self, difficulty: Difficulty | str
    ) -> tuple[VideoMetadata, ...]:
        try:
            requested = Difficulty(difficulty)
        except (TypeError, ValueError) as error:
            raise MetadataValidationError("difficulty must be 'easy' or 'hard'") from error
        return tuple(
            video for video in self._videos if video.difficulty is requested
        )

    def get_by_id(self, video_id: str) -> VideoMetadata:
        try:
            return self._videos_by_id[video_id]
        except KeyError as error:
            raise VideoNotFoundError(f"video ID not found: {video_id!r}") from error


DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = DEFAULT_PROJECT_ROOT / "demo_config.json"


def load_video_metadata(
    config_path: str | Path = DEFAULT_CONFIG_PATH,
    *,
    project_root: str | Path | None = None,
) -> VideoMetadataRepository:
    """Load the default repository without coupling callers to JSON storage."""
    return JsonVideoMetadataRepository(config_path, project_root=project_root)
