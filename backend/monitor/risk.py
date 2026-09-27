from __future__ import annotations

from dataclasses import dataclass
from math import hypot


@dataclass(frozen=True, slots=True)
class BoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def center(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)

    @property
    def size(self) -> tuple[float, float]:
        return (max(0.0, self.x2 - self.x1), max(0.0, self.y2 - self.y1))


@dataclass(frozen=True, slots=True)
class RiskObservation:
    track_id: int
    risk: float
    motion: float
    active_seconds: float


@dataclass(slots=True)
class _TrackState:
    center: tuple[float, float]
    size: tuple[float, float]
    timestamp: float
    velocity: tuple[float, float] = (0.0, 0.0)
    motion: float = 0.0
    active_seconds: float = 0.0
    last_seen: float = 0.0


class MovementRiskTracker:
    """Turns sustained tracked movement into a gradual zero-to-one indicator."""

    def __init__(self, *, seconds_to_red: float = 10.0, track_ttl: float = 1.5) -> None:
        self.seconds_to_red = seconds_to_red
        self.track_ttl = track_ttl
        self._tracks: dict[int, _TrackState] = {}

    def observe(
        self,
        track_id: int,
        box: BoundingBox,
        *,
        timestamp: float,
        frame_width: int,
        frame_height: int,
    ) -> RiskObservation:
        center = (box.center[0] / frame_width, box.center[1] / frame_height)
        state = self._tracks.get(track_id)
        if state is None or timestamp <= state.timestamp:
            state = _TrackState(
                center=center,
                size=(box.size[0] / frame_width, box.size[1] / frame_height),
                timestamp=timestamp,
                last_seen=timestamp,
            )
            self._tracks[track_id] = state
            return RiskObservation(track_id, 0.0, 0.0, 0.0)

        dt = min(timestamp - state.timestamp, 0.5)
        dx = center[0] - state.center[0]
        dy = center[1] - state.center[1]
        velocity = (dx / dt, dy / dt)
        speed = hypot(*velocity)
        size = (box.size[0] / frame_width, box.size[1] / frame_height)
        size_speed = hypot(size[0] - state.size[0], size[1] - state.size[1]) / dt
        activity_speed = speed + size_speed * 0.7
        movement = max(0.0, min(1.0, (activity_speed - 0.015) / 0.18))

        previous_speed = hypot(*state.velocity)
        direction_change = 0.0
        if speed > 0.025 and previous_speed > 0.025:
            cosine = (
                velocity[0] * state.velocity[0] + velocity[1] * state.velocity[1]
            ) / (speed * previous_speed)
            direction_change = max(0.0, min(1.0, (0.65 - cosine) / 1.65))

        instantaneous = min(1.0, movement * 0.8 + direction_change * 0.35)
        state.motion = state.motion * 0.78 + instantaneous * 0.22
        if state.motion >= 0.35:
            state.active_seconds = min(
                self.seconds_to_red,
                state.active_seconds + dt * (0.55 + state.motion * 0.45),
            )
        else:
            state.active_seconds = max(0.0, state.active_seconds - dt * 0.75)

        state.center = center
        state.size = size
        state.timestamp = timestamp
        state.velocity = velocity
        state.last_seen = timestamp
        risk = min(1.0, state.active_seconds / self.seconds_to_red)
        return RiskObservation(track_id, risk, state.motion, state.active_seconds)

    def remove_stale(self, *, timestamp: float, active_ids: set[int]) -> None:
        stale = [
            track_id
            for track_id, state in self._tracks.items()
            if track_id not in active_ids and timestamp - state.last_seen > self.track_ttl
        ]
        for track_id in stale:
            del self._tracks[track_id]

    def has_track(self, track_id: int) -> bool:
        return track_id in self._tracks
