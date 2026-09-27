from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path as ApiPath, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from dotenv import load_dotenv
from starlette.concurrency import run_in_threadpool

from backend.demo import (
    AnswerVerificationUnavailable,
    GeminiAnswerVerifier,
    RoundAlreadySubmittedError,
    RoundNotFoundError,
    SimulatedDemoService,
    select_demo_videos,
)
from backend.metadata import VideoNotFoundError, load_video_metadata
from backend.monitor import (
    CameraMonitor,
    CriticalPersonDetection,
    EmergencyAlertHub,
    GeminiPersonDescriptor,
    PersonDescriptionUnavailable,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

metadata = load_video_metadata()
demo = SimulatedDemoService(metadata)
gemini = GeminiAnswerVerifier()
camera = CameraMonitor(camera_index=0)
emergency_alerts = EmergencyAlertHub()
person_descriptor = GeminiPersonDescriptor()
application_loop: asyncio.AbstractEventLoop | None = None

app = FastAPI(title="Lifeguard AI", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _announce_critical_person(detection: CriticalPersonDetection) -> None:
    try:
        descriptor = await asyncio.wait_for(
            asyncio.to_thread(person_descriptor.describe, detection.image_jpeg),
            timeout=4.0,
        )
    except (PersonDescriptionUnavailable, TimeoutError):
        descriptor = "tracked person"
    await emergency_alerts.broadcast_distress(
        descriptor=descriptor,
        location=detection.location,
    )


def _schedule_critical_person(detection: CriticalPersonDetection) -> None:
    if application_loop is None or not application_loop.is_running():
        return
    asyncio.run_coroutine_threadsafe(
        _announce_critical_person(detection), application_loop
    )


@app.on_event("startup")
async def configure_critical_alerts() -> None:
    global application_loop
    application_loop = asyncio.get_running_loop()
    camera.set_critical_callback(_schedule_critical_person)


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class HumanAnswerRequest(StrictRequest):
    answer: str = Field(min_length=1, max_length=240)
    started_at: float = Field(ge=0, allow_inf_nan=False)


class DemoSelectionRequest(StrictRequest):
    exclude_video_ids: list[str] = Field(default_factory=list, max_length=2)


def _get_round(round_id: str):
    try:
        return demo.get_round(round_id)
    except RoundNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/demo/selection")
def select_demo_rounds(request: DemoSelectionRequest) -> dict[str, object]:
    selected = select_demo_videos(
        metadata, excluded_video_ids=set(request.exclude_video_ids)
    )
    return {
        "rounds": [
            {
                "video_id": video.video_id,
                "difficulty": video.difficulty.value,
            }
            for video in selected
        ]
    }


@app.post("/api/demo/rounds/{video_id}/start")
def start_demo_round(
    video_id: Annotated[str, ApiPath(pattern=r"^[a-z0-9]+(?:_[a-z0-9]+)*$")],
) -> dict[str, object]:
    try:
        round_state = demo.start_round(video_id)
    except VideoNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return {
        "round_id": round_state.round_id,
        "video_id": round_state.video.video_id,
        "difficulty": round_state.video.difficulty.value,
        "video_url": f"/api/demo/videos/{round_state.video.video_id}",
        "ai_answer_time": round_state.ai_answer_time,
    }


@app.post("/api/demo/rounds/{round_id}/human-answer")
async def submit_human_answer(
    round_id: str, request: HumanAnswerRequest
) -> dict[str, object]:
    try:
        submission = await run_in_threadpool(
            demo.submit_human_answer,
            round_id,
            answer=request.answer,
            started_at=request.started_at,
            verifier=gemini,
        )
    except RoundNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RoundAlreadySubmittedError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except AnswerVerificationUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "answer": submission.answer,
        "started_at": submission.started_at,
        "correct": submission.correct,
    }


@app.get("/api/demo/rounds/{round_id}/result")
def demo_round_result(round_id: str) -> dict[str, object]:
    round_state = _get_round(round_id)
    human = round_state.human_submission
    return {
        "round_id": round_state.round_id,
        "video_id": round_state.video.video_id,
        "ai": {
            "answered": round_state.ai_answered,
            "time": round_state.ai_answer_time,
            "correct": round_state.ai_correct,
            "answer": round_state.ai_answer,
        },
        "human": (
            {
                "time": human.started_at,
                "correct": human.correct,
                "answer": human.answer,
            }
            if human is not None
            else None
        ),
        "first": round_state.winner(),
    }


@app.get("/api/demo/videos/{video_id}")
def demo_video(video_id: str) -> FileResponse:
    try:
        video = metadata.get_by_id(video_id)
    except VideoNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    path = PROJECT_ROOT / Path(*video.relative_path.split("/"))
    return FileResponse(path, media_type="video/mp4")


@app.post("/api/monitor/start")
def start_monitor() -> dict[str, bool]:
    camera.start()
    return {"started": True}


@app.post("/api/monitor/stop")
def stop_monitor() -> dict[str, bool]:
    camera.stop()
    return {"stopped": True}


@app.get("/api/monitor/status")
def monitor_status() -> dict[str, object]:
    status = camera.status()
    return {
        "running": status.running,
        "ready": status.ready,
        "people": status.people,
        "highest_risk": status.highest_risk,
        "error": status.error,
    }


@app.get("/api/monitor/stream")
def monitor_stream() -> StreamingResponse:
    return StreamingResponse(
        camera.stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )


@app.websocket("/api/monitor/alerts")
async def monitor_alerts(websocket: WebSocket, client_id: str) -> None:
    await emergency_alerts.connect(websocket, client_id)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") != "emergency":
                await websocket.send_json(
                    {"type": "error", "message": "unsupported alert message"}
                )
                continue
            recipients = await emergency_alerts.broadcast_emergency(
                source_client_id=client_id
            )
            await websocket.send_json({"type": "sent", "recipients": recipients})
    except WebSocketDisconnect:
        pass
    finally:
        emergency_alerts.disconnect(websocket)


@app.on_event("shutdown")
def shutdown_camera() -> None:
    camera.stop()
