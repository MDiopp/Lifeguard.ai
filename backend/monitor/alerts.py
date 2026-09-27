from __future__ import annotations

from fastapi import WebSocket


EMERGENCY_MESSAGE = "Critical Alert🚨: Your child is unsupervised near your pool 🚨"


class EmergencyAlertHub:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[websocket] = client_id

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    async def broadcast_emergency(self, *, source_client_id: str) -> int:
        delivered = 0
        stale: list[WebSocket] = []
        payload = {"type": "emergency", "message": EMERGENCY_MESSAGE}
        for websocket, client_id in tuple(self._connections.items()):
            if client_id == source_client_id:
                continue
            try:
                await websocket.send_json(payload)
                delivered += 1
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)
        return delivered
