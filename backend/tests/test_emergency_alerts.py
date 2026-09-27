from __future__ import annotations

import unittest

from backend.monitor import EMERGENCY_MESSAGE, EmergencyAlertHub


class FakeWebSocket:
    def __init__(self, *, fail: bool = False) -> None:
        self.accepted = False
        self.fail = fail
        self.messages: list[dict[str, str]] = []

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, message: dict[str, str]) -> None:
        if self.fail:
            raise RuntimeError("connection closed")
        self.messages.append(message)


class EmergencyAlertHubTests(unittest.IsolatedAsyncioTestCase):
    async def test_emergency_reaches_other_clients_but_not_the_sender(self) -> None:
        hub = EmergencyAlertHub()
        laptop = FakeWebSocket()
        phone = FakeWebSocket()
        await hub.connect(laptop, "laptop")  # type: ignore[arg-type]
        await hub.connect(phone, "phone")  # type: ignore[arg-type]

        delivered = await hub.broadcast_emergency(source_client_id="laptop")

        self.assertTrue(laptop.accepted)
        self.assertTrue(phone.accepted)
        self.assertEqual(delivered, 1)
        self.assertEqual(laptop.messages, [])
        self.assertEqual(
            phone.messages,
            [{"type": "emergency", "message": EMERGENCY_MESSAGE}],
        )

    async def test_closed_clients_are_removed_during_broadcast(self) -> None:
        hub = EmergencyAlertHub()
        closed_phone = FakeWebSocket(fail=True)
        await hub.connect(closed_phone, "phone")  # type: ignore[arg-type]

        self.assertEqual(
            await hub.broadcast_emergency(source_client_id="laptop"),
            0,
        )
        closed_phone.fail = False
        self.assertEqual(
            await hub.broadcast_emergency(source_client_id="laptop"),
            0,
        )


if __name__ == "__main__":
    unittest.main()
