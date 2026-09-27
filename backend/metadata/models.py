"""Pydantic models for local demo-video metadata."""

from __future__ import annotations

from enum import Enum
from pathlib import PurePosixPath
import re
from typing import Annotated, Any, Mapping

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError as PydanticValidationError,
    field_validator,
    model_validator,
)


ID_PATTERN = re.compile(r"^[a-z0-9]+(?:_[a-z0-9]+)*$")


class MetadataValidationError(ValueError):
    """Raised when metadata does not match the supported schema."""


class DuplicateIdError(MetadataValidationError):
    """Raised when a JSON key, video ID, or swimmer ID is duplicated."""


class Difficulty(str, Enum):
    EASY = "easy"
    HARD = "hard"


class CameraViewLocation(str, Enum):
    TOP_LEFT = "top-left"
    TOP_CENTER = "top-center"
    TOP_RIGHT = "top-right"
    MIDDLE_LEFT = "middle-left"
    MIDDLE_CENTER = "middle-center"
    MIDDLE_RIGHT = "middle-right"
    MIDDLE_TOP_LEFT = "middle/top-left"
    MIDDLE_TOP_MIDDLE_LEFT = "middle/top-middle-left"
    MIDDLE_TOP_MIDDLE = "middle/top-middle"
    MIDDLE_TOP_RIGHT = "middle/top-right"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_CENTER = "bottom-center"
    BOTTOM_RIGHT = "bottom-right"


class MetadataModel(BaseModel):
    """Strict, immutable base model shared by metadata documents."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class AIAnswerTimeRange(MetadataModel):
    minimum: float = Field(ge=0, allow_inf_nan=False)
    maximum: float = Field(ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def maximum_must_not_precede_minimum(self) -> AIAnswerTimeRange:
        if self.maximum < self.minimum:
            raise ValueError("maximum must be greater than or equal to minimum")
        return self


def _format_validation_error(
    error: PydanticValidationError, *, context: str
) -> MetadataValidationError:
    messages: list[str] = []
    for detail in error.errors(include_url=False, include_input=False):
        location = ".".join(str(part) for part in detail["loc"])
        field = f"{context}.{location}" if location else context
        messages.append(f"{field}: {detail['msg']}")
    return MetadataValidationError("; ".join(messages))


def _validate_identifier(identifier: str, *, field: str) -> str:
    if not ID_PATTERN.fullmatch(identifier):
        raise MetadataValidationError(
            f"{field} must use lowercase letters, numbers, and single underscores"
        )
    return identifier


class DistressedSwimmerMetadata(MetadataModel):
    id: str = Field(min_length=1, pattern=ID_PATTERN.pattern)
    description: str | None = None
    camera_view_location: (
        Annotated[CameraViewLocation, Field(strict=False)] | None
    ) = None

    @field_validator("description")
    @classmethod
    def optional_strings_must_not_be_blank(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            raise ValueError("must be null or a non-empty string")
        return value

    def to_document(self) -> dict[str, Any]:
        """Return a JSON- and MongoDB-compatible document."""
        return self.model_dump(mode="json")


class SimulatedAIAnswerMetadata(MetadataModel):
    answer: str | None = Field(default=None, min_length=1)
    correct: bool

    @field_validator("answer")
    @classmethod
    def answer_must_not_be_blank(cls, answer: str | None) -> str | None:
        if answer is not None and not answer.strip():
            raise ValueError("must be a non-empty string")
        return answer

    @model_validator(mode="after")
    def missing_answer_cannot_be_correct(self) -> SimulatedAIAnswerMetadata:
        if self.answer is None and self.correct:
            raise ValueError("correct must be false when answer is null")
        return self


class VideoMetadata(MetadataModel):
    video_id: str = Field(min_length=1, pattern=ID_PATTERN.pattern)
    filename: str = Field(min_length=1)
    relative_path: str = Field(min_length=1)
    difficulty: Difficulty = Field(strict=False)
    distressed_swimmers: tuple[DistressedSwimmerMetadata, ...] = Field(
        min_length=1,
        strict=False,
    )
    ai_answer_time_range: AIAnswerTimeRange
    simulated_ai_answer: SimulatedAIAnswerMetadata | None = None
    notes: str | None = None

    @field_validator("filename")
    @classmethod
    def filename_must_be_mp4_basename(cls, filename: str) -> str:
        if PurePosixPath(filename).name != filename or not filename.endswith(".mp4"):
            raise ValueError("must be an .mp4 basename without directories")
        return filename

    @field_validator("notes")
    @classmethod
    def notes_must_not_be_blank(cls, notes: str | None) -> str | None:
        if notes is not None and not notes.strip():
            raise ValueError("must be null or a non-empty string")
        return notes

    @field_validator("distressed_swimmers")
    @classmethod
    def swimmer_ids_must_be_unique(
        cls,
        swimmers: tuple[DistressedSwimmerMetadata, ...],
    ) -> tuple[DistressedSwimmerMetadata, ...]:
        seen: set[str] = set()
        for swimmer in swimmers:
            if swimmer.id in seen:
                raise ValueError(f"duplicate swimmer ID {swimmer.id!r}")
            seen.add(swimmer.id)
        return swimmers

    @model_validator(mode="after")
    def path_must_match_difficulty_and_filename(self) -> VideoMetadata:
        expected_path = f"demo_videos/{self.difficulty.value}/{self.filename}"
        if self.relative_path != expected_path:
            raise ValueError(f"relative_path must be {expected_path!r}")
        return self

    @classmethod
    def from_mapping(
        cls, value: Mapping[str, Any], *, config_key: str
    ) -> VideoMetadata:
        context = f"videos.{config_key}"
        _validate_identifier(config_key, field=f"{context} config key")
        try:
            video = cls.model_validate(value)
        except PydanticValidationError as error:
            formatted_error = _format_validation_error(error, context=context)
            if "duplicate swimmer ID" in str(formatted_error):
                raise DuplicateIdError(str(formatted_error)) from error
            raise formatted_error from error

        if config_key != video.video_id:
            raise MetadataValidationError(
                f"{context}.video_id must match its config key ({config_key!r})"
            )

        return video

    def to_document(self) -> dict[str, Any]:
        """Return a document suitable for JSON or a future MongoDB insert."""
        return self.model_dump(mode="json")


class _ConfigEnvelope(MetadataModel):
    videos: dict[str, Mapping[str, Any]]


class DemoConfig(MetadataModel):
    videos: tuple[VideoMetadata, ...]

    @field_validator("videos")
    @classmethod
    def video_ids_must_be_unique(
        cls, videos: tuple[VideoMetadata, ...]
    ) -> tuple[VideoMetadata, ...]:
        seen: set[str] = set()
        for video in videos:
            if video.video_id in seen:
                raise ValueError(f"duplicate video ID {video.video_id!r}")
            seen.add(video.video_id)
        return videos

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> DemoConfig:
        try:
            envelope = _ConfigEnvelope.model_validate(value)
        except PydanticValidationError as error:
            raise _format_validation_error(error, context="config") from error

        videos = tuple(
            VideoMetadata.from_mapping(metadata, config_key=key)
            for key, metadata in envelope.videos.items()
        )
        return cls(videos=videos)

    def to_document(self) -> dict[str, Any]:
        return {
            "videos": {
                video.video_id: video.to_document() for video in self.videos
            }
        }
