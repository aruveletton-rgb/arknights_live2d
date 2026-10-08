from __future__ import annotations

import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from server.orchestrator import app
from server.orchestrator.store import Store


class ApiContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = Store(str(Path(self.temp_dir.name) / "api.sqlite3"))
        self.admin = self.store.create_user("admin", "admin password", "admin")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.store_patch = patch.object(app, "STORE", self.store)
        self.store_patch.start()

    def tearDown(self) -> None:
        self.store_patch.stop()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request(self, method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, dict]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def login(self, username: str, password: str) -> str:
        status, response = self.request("POST", "/api/auth/login", {"username": username, "password": password})
        self.assertEqual(200, status)
        return response["access_token"]

    def test_account_history_and_memory_routes(self) -> None:
        admin_token = self.login("admin", "admin password")
        status, response = self.request("POST", "/api/admin/users", {"username": "alice", "password": "alice password"}, admin_token)
        self.assertEqual(201, status)
        alice_token = self.login("alice", "alice password")
        bob_token = self.login("admin", "admin password")

        status, _ = self.request("POST", "/api/chat", {"session_id": "session-a", "text": "private", "language": "zh-CN"}, alice_token)
        self.assertEqual(200, status)
        status, history = self.request("GET", "/api/history", token=bob_token)
        self.assertEqual(200, status)
        self.assertEqual([], history["messages"])

        status, _ = self.request("POST", "/api/memory", {"content": "must confirm", "confirmed": False}, alice_token)
        self.assertEqual(428, status)
        status, memory_response = self.request("POST", "/api/memory", {"content": "remember this", "confirmed": True}, alice_token)
        self.assertEqual(201, status)
        memory_id = memory_response["memory"]["id"]
        status, _ = self.request("DELETE", f"/api/memory/{memory_id}", token=alice_token)
        self.assertEqual(200, status)
        status, memories = self.request("GET", "/api/memory", token=alice_token)
        self.assertEqual(200, status)
        self.assertEqual([], memories["memories"])

        status, _ = self.request("POST", "/api/auth/logout", token=alice_token)
        self.assertEqual(200, status)
        status, _ = self.request("GET", "/api/history", token=alice_token)
        self.assertEqual(401, status)

    def test_account_auth_can_be_required_without_breaking_session_mode(self) -> None:
        self.store.create_user("required", "required password", "user")
        token = self.login("required", "required password")
        with patch.object(app, "REQUIRE_ACCOUNT_AUTH", True):
            status, _ = self.request("POST", "/api/chat", {"text": "anonymous"})
            self.assertEqual(401, status)
            status, _ = self.request("POST", "/api/chat", {"text": "account"}, token)
            self.assertEqual(200, status)


if __name__ == "__main__":
    unittest.main()
