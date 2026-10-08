"""SQLite-backed account, session, history and memory storage for VM-1."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


class Store:
    def __init__(self, path: str | None = None) -> None:
        configured = path or os.getenv("DB_PATH", "data/arknights-vtuber.sqlite3")
        self._memory = configured == ":memory:"
        self._anchor: sqlite3.Connection | None = None
        if self._memory:
            self.path = Path(":memory:")
            self._db_target = f"file:arknights_store_{id(self)}?mode=memory&cache=shared"
            self._anchor = sqlite3.connect(self._db_target, uri=True, check_same_thread=False)
            self._anchor.row_factory = sqlite3.Row
        else:
            self.path = Path(configured)
            self._db_target = str(self.path)
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()
        self.bootstrap_admin()

    def connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_target, uri=self._memory, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    @contextmanager
    def connect(self):
        connection = self.connection()
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    disabled INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    language TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS messages_user_created_idx ON messages(user_id, created_at);
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS memories_user_updated_idx ON memories(user_id, updated_at);
                """
            )

    def bootstrap_admin(self) -> None:
        username = os.getenv("ADMIN_USERNAME", "").strip()
        password = os.getenv("ADMIN_PASSWORD", "")
        if not username or not password:
            return
        with self.connect() as connection:
            existing = connection.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if existing:
                return
            connection.execute(
                "INSERT INTO users(username, password_hash, role, created_at) VALUES (?, ?, 'admin', ?)",
                (username, hash_password(password), iso_now()),
            )

    def create_user(self, username: str, password: str, role: str = "user") -> dict[str, Any]:
        username = username.strip()
        if not username or len(username) > 80 or len(password) < 8 or role not in {"user", "admin"}:
            raise ValueError("用户名不能为空，密码至少需要 8 个字符")
        try:
            with self.connect() as connection:
                cursor = connection.execute(
                    "INSERT INTO users(username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                    (username, hash_password(password), role, iso_now()),
                )
                return {"id": cursor.lastrowid, "username": username, "role": role}
        except sqlite3.IntegrityError as error:
            raise ValueError("用户名已存在") from error

    def authenticate(self, username: str, password: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT id, username, password_hash, role, disabled FROM users WHERE username = ?",
                (username.strip(),),
            ).fetchone()
        if not row or row["disabled"] or not verify_password(password, row["password_hash"]):
            return None
        return {"id": row["id"], "username": row["username"], "role": row["role"]}

    def create_session(self, user_id: int, lifetime_hours: int = 24) -> tuple[str, str]:
        token = secrets.token_urlsafe(32)
        expires = utc_now() + timedelta(hours=lifetime_hours)
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (hash_token(token), user_id, expires.isoformat()),
            )
        return token, expires.isoformat()

    def user_for_token(self, token: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT users.id, users.username, users.role, users.disabled, sessions.expires_at
                FROM sessions JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL
                """,
                (hash_token(token),),
            ).fetchone()
        if not row or row["disabled"] or datetime.fromisoformat(row["expires_at"]) <= utc_now():
            return None
        return {"id": row["id"], "username": row["username"], "role": row["role"]}

    def revoke_token(self, token: str) -> None:
        with self.connect() as connection:
            connection.execute("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?", (iso_now(), hash_token(token)))

    def add_message(self, user_id: int, session_id: str, role: str, text: str, language: str) -> None:
        if role not in {"user", "assistant"} or not text:
            return
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO messages(user_id, session_id, role, text, language, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, session_id, role, text, language, iso_now()),
            )

    def history(self, user_id: int, limit: int = 100) -> list[dict[str, Any]]:
        cutoff = (utc_now() - timedelta(days=30)).isoformat()
        bounded_limit = max(1, min(limit, 500))
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT id, session_id, role, text, language, created_at FROM messages WHERE user_id = ? AND created_at >= ? ORDER BY id DESC LIMIT ?",
                (user_id, cutoff, bounded_limit),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def delete_history(self, user_id: int, before: str | None = None) -> int:
        with self.connect() as connection:
            if before:
                cursor = connection.execute("DELETE FROM messages WHERE user_id = ? AND created_at < ?", (user_id, before))
            else:
                cursor = connection.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))
            return cursor.rowcount

    def list_memories(self, user_id: int) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT id, content, created_at, updated_at FROM memories WHERE user_id = ? ORDER BY updated_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def add_memory(self, user_id: int, content: str, confirmed: bool) -> dict[str, Any]:
        if not confirmed:
            raise PermissionError("保存记忆前必须明确确认")
        content = content.strip()
        if not content or len(content) > 2000:
            raise ValueError("记忆内容必须为 1 到 2000 个字符")
        now = iso_now()
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT INTO memories(user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, content, now, now),
            )
            return {"id": cursor.lastrowid, "content": content, "created_at": now, "updated_at": now}

    def update_memory(self, user_id: int, memory_id: int, content: str, confirmed: bool) -> dict[str, Any] | None:
        if not confirmed:
            raise PermissionError("修改记忆前必须明确确认")
        content = content.strip()
        if not content or len(content) > 2000:
            raise ValueError("记忆内容必须为 1 到 2000 个字符")
        now = iso_now()
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE memories SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (content, now, memory_id, user_id),
            )
            if cursor.rowcount == 0:
                return None
        return {"id": memory_id, "content": content, "updated_at": now}

    def delete_memory(self, user_id: int, memory_id: int) -> bool:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
            return cursor.rowcount > 0


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    iterations = 300_000
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations_text))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (TypeError, ValueError):
        return False
