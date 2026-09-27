"""Local demo-video metadata models and repository."""

from .models import (
    AIAnswerTimeRange,
    CameraViewLocation,
    DemoConfig,
    Difficulty,
    DistressedSwimmerMetadata,
    SimulatedAIAnswerMetadata,
    VideoMetadata,
)
from .repository import (
    ConfigFileNotFoundError,
    DuplicateIdError,
    JsonVideoMetadataRepository,
    MalformedConfigError,
    MetadataValidationError,
    VideoFileNotFoundError,
    VideoMetadataRepository,
    VideoNotFoundError,
    load_video_metadata,
)

__all__ = [
    "AIAnswerTimeRange",
    "CameraViewLocation",
    "ConfigFileNotFoundError",
    "DemoConfig",
    "Difficulty",
    "DistressedSwimmerMetadata",
    "DuplicateIdError",
    "JsonVideoMetadataRepository",
    "MalformedConfigError",
    "MetadataValidationError",
    "SimulatedAIAnswerMetadata",
    "VideoFileNotFoundError",
    "VideoMetadata",
    "VideoMetadataRepository",
    "VideoNotFoundError",
    "load_video_metadata",
]
