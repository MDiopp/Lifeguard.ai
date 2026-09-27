from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from threading import Event, Lock, Thread
import time
from typing import Iterator

from .risk import BoundingBox, MovementRiskTracker


@dataclass(frozen=True, slots=True)
class CameraStatus:
    running: bool
    ready: bool
    people: int
    highest_risk: float
    error: str | None


class _YoloPersonTracker:
    def __init__(self, model_path: Path) -> None:
        project_root = Path(__file__).resolve().parents[2]
        config_root = project_root / ".ultralytics"
        config_root.mkdir(exist_ok=True)
        os.environ.setdefault("YOLO_CONFIG_DIR", str(config_root))
        from ultralytics import YOLO

        self.model = YOLO(str(model_path if model_path.is_file() else "yolo11s.pt"))

    def detect(self, frame):
        result = self.model.track(
            frame,
            persist=True,
            classes=[0],
            conf=0.3,
            iou=0.5,
            imgsz=640,
            tracker="bytetrack.yaml",
            verbose=False,
        )[0]
        if result.boxes is None or result.boxes.id is None:
            return []
        boxes = result.boxes.xyxy.int().cpu().tolist()
        ids = result.boxes.id.int().cpu().tolist()
        return list(zip(ids, boxes, strict=True))


class CameraMonitor:
    def __init__(self, *, camera_index: int = 0, model_path: Path | None = None) -> None:
        self.camera_index = camera_index
        self.model_path = model_path or Path(__file__).resolve().parents[2] / "models" / "yolo11s.pt"
        self._lock = Lock()
        self._stop = Event()
        self._thread: Thread | None = None
        self._frame: bytes | None = None
        self._people = 0
        self._highest_risk = 0.0
        self._error: str | None = None

    def start(self) -> None:
        with self._lock:
            if self._thread is not None and self._thread.is_alive():
                return
            self._stop.clear()
            self._error = None
            self._frame = None
            self._thread = Thread(target=self._run, daemon=True, name="camera-monitor")
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=3)

    def status(self) -> CameraStatus:
        with self._lock:
            running = self._thread is not None and self._thread.is_alive()
            return CameraStatus(
                running=running,
                ready=self._frame is not None,
                people=self._people,
                highest_risk=round(self._highest_risk, 3),
                error=self._error,
            )

    @staticmethod
    def _risk_color(risk: float) -> tuple[int, int, int]:
        safe = (114, 157, 46)
        yellow = (74, 185, 230)
        red = (76, 76, 217)
        if risk <= 0.5:
            amount = risk / 0.5
            start, end = safe, yellow
        else:
            amount = (risk - 0.5) / 0.5
            start, end = yellow, red
        return tuple(int(a + (b - a) * amount) for a, b in zip(start, end, strict=True))

    def _draw_person(self, frame, track_id: int, box: list[int], risk: float) -> None:
        import cv2

        height, width = frame.shape[:2]
        x1, y1, x2, y2 = box
        x1, x2 = max(0, x1), min(width - 1, x2)
        y1, y2 = max(0, y1), min(height - 1, y2)
        color = self._risk_color(risk)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label = f"Person {track_id}  {round(risk * 100):d}%"
        cv2.putText(
            frame,
            label,
            (x1, max(24, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            2,
            cv2.LINE_AA,
        )

        bar_x1 = min(width - 13, x2 + 5)
        bar_x2 = min(width - 3, bar_x1 + 8)
        bar_top, bar_bottom = y1, max(y1 + 3, y2)
        cv2.rectangle(frame, (bar_x1, bar_top), (bar_x2, bar_bottom), (55, 70, 72), 1)
        fill_height = max(2, round((bar_bottom - bar_top) * risk))
        cv2.rectangle(
            frame,
            (bar_x1 + 1, bar_bottom - fill_height),
            (bar_x2 - 1, bar_bottom - 1),
            color,
            -1,
        )

    def _run(self) -> None:
        import cv2

        capture = None
        try:
            backend = cv2.CAP_DSHOW if os.name == "nt" else cv2.CAP_ANY
            capture = cv2.VideoCapture(self.camera_index, backend)
            capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            if not capture.isOpened():
                raise RuntimeError(f"camera {self.camera_index} could not be opened")

            detector = _YoloPersonTracker(self.model_path)
            risks = MovementRiskTracker(seconds_to_red=10.0)
            started = time.monotonic()
            while not self._stop.is_set():
                ok, frame = capture.read()
                if not ok:
                    raise RuntimeError("the camera stopped returning frames")
                timestamp = time.monotonic() - started
                detections = detector.detect(frame)
                height, width = frame.shape[:2]
                active_ids: set[int] = set()
                observations = []
                for track_id, coordinates in detections:
                    active_ids.add(track_id)
                    box = BoundingBox(*coordinates)
                    observation = risks.observe(
                        track_id,
                        box,
                        timestamp=timestamp,
                        frame_width=width,
                        frame_height=height,
                    )
                    observations.append(observation)
                    self._draw_person(frame, track_id, coordinates, observation.risk)
                risks.remove_stale(timestamp=timestamp, active_ids=active_ids)
                encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 84])
                if not encoded:
                    continue
                with self._lock:
                    self._frame = buffer.tobytes()
                    self._people = len(detections)
                    self._highest_risk = max((item.risk for item in observations), default=0.0)
        except Exception as error:
            with self._lock:
                self._error = str(error)
        finally:
            if capture is not None:
                capture.release()

    def stream(self) -> Iterator[bytes]:
        self.start()
        last_frame: bytes | None = None
        while not self._stop.is_set():
            with self._lock:
                frame = self._frame
                error = self._error
                running = self._thread is not None and self._thread.is_alive()
            if frame is not None and frame is not last_frame:
                last_frame = frame
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            elif error is not None or not running:
                break
            else:
                time.sleep(0.03)
