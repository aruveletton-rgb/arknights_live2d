from __future__ import annotations

import sqlite3
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from server.orchestrator.store import Store, utc_now


class StoreContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = Store(str(Path(self.temp_dir.name) / "test.sqlite3"))
        self.user_a = self.store.create_user("alice", "correct horse battery", "user")
        self.user_b = self.store.create_user("bob", "correct horse battery", "user")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_password_is_hashed_and_wrong_password_rejected(self) -> None:
        connection = sqlite3.connect(self.store.path)
        try:
            stored = connection.execute("SELECT password_hash FROM users WHERE username = 'alice'").fetchone()[0]
        finally:
            connection.close()
        self.assertNotEqual(stored, "correct horse battery")
        self.assertTrue(stored.startswith("pbkdf2_sha256$"))
        self.assertIsNone(self.store.authenticate("alice", "wrong password"))

    def test_sessions_expire_and_revoke(self) -> None:
        token, _ = self.store.create_session(self.user_a["id"], lifetime_hours=0)
        self.assertIsNone(self.store.user_for_token(token))
        token, _ = self.store.create_session(self.user_a["id"])
        self.assertIsNotNone(self.store.user_for_token(token))
        self.store.revoke_token(token)
        self.assertIsNone(self.store.user_for_token(token))

    def test_history_and_memory_are_account_isolated(self) -> None:
        self.store.add_message(self.user_a["id"], "session-a", "user", "private", "zh-CN")
        self.assertEqual(["private"], [item["text"] for item in self.store.history(self.user_a["id"])])
        self.assertEqual([], self.store.history(self.user_b["id"]))
        with self.assertRaises(PermissionError):
            self.store.add_memory(self.user_a["id"], "should not save", False)
        memory = self.store.add_memory(self.user_a["id"], "keep this", True)
        self.assertEqual([], self.store.list_memories(self.user_b["id"]))
        self.assertTrue(self.store.delete_memory(self.user_a["id"], memory["id"]))
        self.assertEqual([], self.store.list_memories(self.user_a["id"]))

    def test_history_excludes_messages_older_than_30_days(self) -> None:
        old = (utc_now() - timedelta(days=31)).isoformat()
        with self.store.connect() as connection:
            connection.execute(
                "INSERT INTO messages(user_id, session_id, role, text, language, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (self.user_a["id"], "old", "user", "expired", "zh-CN", old),
            )
        self.store.add_message(self.user_a["id"], "new", "user", "fresh", "zh-CN")
        self.assertEqual(["fresh"], [item["text"] for item in self.store.history(self.user_a["id"])])
        self.assertEqual(2, self.store.delete_history(self.user_a["id"]))
        self.assertEqual([], self.store.history(self.user_a["id"]))


if __name__ == "__main__":
    unittest.main()
