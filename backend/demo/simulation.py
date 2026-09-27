from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR
from random import SystemRandom
from threading import Lock
from typing import Literal, Protocol
from uuid import uuid4

from backend.metadata import VideoMetadata, VideoMetadataRepository


class AnswerVerifier(Protocol):
    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool: ...


class IntegerRandom(Protocol):
    def randint(self, lower: int, upper: int) -> int: ...


class RoundNotFoundError(LookupError):
    pass


class RoundAlreadySubmittedError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class HumanSubmission:
    answer: str
    started_at: float
    correct: bool


@dataclass(slots=True)
class SimulatedRound:
    round_id: str
    video: VideoMetadata
    ai_answer_time: float | None
    human_submission: HumanSubmission | None = None

    @property
    def target(self):
        return self.video.distressed_swimmers[0]

    @property
    def ai_answer(self) -> str | None:
        configured = self.video.simulated_ai_answer
        return configured.answer if configured is not None else "Possible distress detected"

    @property
    def ai_answered(self) -> bool:
        return self.ai_answer is not None

    @property
    def ai_correct(self) -> bool:
        configured = self.video.simulated_ai_answer
        return configured.correct if configured is not None else True

    def winner(self) -> Literal["human", "ai", "tie", "none"]:
        human_correct = self.human_submission is not None and self.human_submission.correct
        if human_correct and self.ai_correct and self.ai_answer_time is not None:
            difference = self.human_submission.started_at - self.ai_answer_time
            if abs(difference) < 0.005:
                return "tie"
            return "human" if difference < 0 else "ai"
        if human_correct:
            return "human"
        if self.ai_correct:
            return "ai"
        return "none"


class SimulatedDemoService:
    def __init__(
        self,
        repository: VideoMetadataRepository,
        *,
        random_source: IntegerRandom | None = None,
    ) -> None:
        self.repository = repository
        self.random = random_source or SystemRandom()
        self._rounds: dict[str, SimulatedRound] = {}
        self._lock = Lock()

    @staticmethod
    def _hundredths(value: float, rounding: str) -> int:
        return int((Decimal(str(value)) * 100).to_integral_value(rounding=rounding))

    def start_round(self, video_id: str) -> SimulatedRound:
        video = self.repository.get_by_id(video_id)
        configured_answer = video.simulated_ai_answer
        if configured_answer is not None and configured_answer.answer is None:
            answer_time = None
        else:
            lower = self._hundredths(
                video.ai_answer_time_range.minimum, ROUND_CEILING
            )
            upper = self._hundredths(
                video.ai_answer_time_range.maximum, ROUND_FLOOR
            )
            answer_time = self.random.randint(lower, upper) / 100
        round_state = SimulatedRound(
            round_id=uuid4().hex,
            video=video,
            ai_answer_time=answer_time,
        )
        with self._lock:
            self._rounds[round_state.round_id] = round_state
        return round_state

    def get_round(self, round_id: str) -> SimulatedRound:
        with self._lock:
            try:
                return self._rounds[round_id]
            except KeyError as error:
                raise RoundNotFoundError(f"round not found: {round_id}") from error

    def submit_human_answer(
        self,
        round_id: str,
        *,
        answer: str,
        started_at: float,
        verifier: AnswerVerifier,
    ) -> HumanSubmission:
        cleaned = answer.strip()
        if not cleaned:
            raise ValueError("answer must not be blank")
        if started_at < 0:
            raise ValueError("started_at must be non-negative")

        round_state = self.get_round(round_id)
        with self._lock:
            if round_state.human_submission is not None:
                raise RoundAlreadySubmittedError(
                    "a human answer has already been submitted for this round"
                )

        target = round_state.target
        correct = verifier.verify(
            cleaned,
            reference_description=target.description or "the annotated swimmer",
            reference_location=(
                target.camera_view_location.value
                if target.camera_view_location is not None
                else None
            ),
        )
        submission = HumanSubmission(
            answer=cleaned,
            started_at=round(started_at, 2),
            correct=correct,
        )
        with self._lock:
            if round_state.human_submission is not None:
                raise RoundAlreadySubmittedError(
                    "a human answer has already been submitted for this round"
                )
            round_state.human_submission = submission
        return submission
