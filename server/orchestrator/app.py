import base64
import json
import os
import urllib.error
import urllib.request
from http import HTTPStatus
from threading import BoundedSemaphore
from urllib.parse import parse_qs, urlsplit

from server.common.http_utils import DEMO_WAV_BASE64, QuietHandler, error_payload, read_json, read_multipart, serve, write_json, write_wav
from server.orchestrator.store import Store


PORT = int(os.getenv("PORT", "8000"))
PRIMARY_TTS_URL = os.getenv("PRIMARY_TTS_URL", "http://tts:8082")
PRIMARY_ASR_URL = os.getenv("PRIMARY_ASR_URL", PRIMARY_TTS_URL.replace(":8082", ":8083"))
API_TOKEN = os.getenv("API_TOKEN", "").strip()
REQUIRE_ACCOUNT_AUTH = os.getenv("REQUIRE_ACCOUNT_AUTH", "0").strip().lower() in {"1", "true", "yes"}
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "2"))
SLOTS = BoundedSemaphore(MAX_CONCURRENT)
STORE = Store()


def authorized(handler: QuietHandler) -> bool:
    if not API_TOKEN:
        return True
    supplied = handler.headers.get("X-API-Token", "").strip()
    if not supplied:
        authorization = handler.headers.get("Authorization", "")
        supplied = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    return supplied == API_TOKEN


def bearer_token(handler: QuietHandler) -> str | None:
    authorization = handler.headers.get("Authorization", "")
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


def account_user(handler: QuietHandler) -> dict[str, object] | None:
    token = bearer_token(handler)
    return STORE.user_for_token(token) if token else None


def auth_error(handler: QuietHandler) -> None:
    write_json(handler, HTTPStatus.UNAUTHORIZED, {"error": error_payload("UNAUTHORIZED", "缺少有效的访问凭据")})


def account_required(handler: QuietHandler) -> dict[str, object] | None:
    user = account_user(handler)
    if not user:
        auth_error(handler)
    return user


def admin_required(handler: QuietHandler) -> dict[str, object] | None:
    user = account_user(handler)
    if not user:
        auth_error(handler)
        return None
    if user.get("role") != "admin":
        write_json(handler, HTTPStatus.FORBIDDEN, {"error": error_payload("FORBIDDEN", "需要管理员权限")})
        return None
    return user


def call_json(url: str, payload: dict[str, object], timeout: float = 3.0) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        value = json.loads(response.read().decode("utf-8"))
    return value if isinstance(value, dict) else {}


def call_multipart(url: str, audio: bytes, language: str, timeout: float = 5.0) -> dict[str, object]:
    boundary = "----arknights-audio-boundary"
    body = b"".join(
        [
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n{language}\r\n".encode("utf-8"),
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"recording.webm\"\r\nContent-Type: audio/webm\r\n\r\n".encode("utf-8"),
            audio,
            f"\r\n--{boundary}--\r\n".encode("ascii"),
        ]
    )
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        value = json.loads(response.read().decode("utf-8"))
    return value if isinstance(value, dict) else {}


def get_json(url: str, timeout: float = 2.0) -> dict[str, object]:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        value = json.loads(response.read().decode("utf-8"))
    return value if isinstance(value, dict) else {}


def fallback_audio() -> dict[str, object]:
    if os.getenv("FALLBACK_TTS_FAILURE", "0") == "1":
        raise RuntimeError("fallback TTS disabled for failure rehearsal")
    return {
        "audio_url": None,
        "audio_base64": DEMO_WAV_BASE64,
        "mime_type": "audio/wav",
        "duration_ms": 180,
        "provider": "mock-fallback",
        "cache_hit": False,
    }


class Handler(QuietHandler):
    def do_GET(self) -> None:  # noqa: N802
        route = urlsplit(self.path)
        if route.path == "/api/health":
            primary = "ok"
            asr = "ok"
            try:
                result = get_json(f"{PRIMARY_TTS_URL}/api/health")
                if result.get("status") != "ok":
                    primary = "down"
            except (OSError, urllib.error.URLError, json.JSONDecodeError):
                primary = "down"
            try:
                result = get_json(f"{PRIMARY_ASR_URL}/api/health")
                if result.get("status") != "ok":
                    asr = "down"
            except (OSError, urllib.error.URLError, json.JSONDecodeError):
                asr = "down"
            write_json(
                self,
                HTTPStatus.OK,
                {"status": "ok", "service": "orchestrator", "llm": "ok", "tts": primary, "tts_fallback": "ok", "asr": asr},
            )
            return
        if route.path == "/api/characters":
            write_json(self, HTTPStatus.OK, {"characters": [{"character_id": "arknights_fan_001", "display_name": "罗德岛风格同人桌宠", "live2d_model_name": "deferred"}]})
            return
        if route.path == "/api/history":
            user = account_required(self)
            if user:
                query = parse_qs(route.query)
                raw_limit = query.get("limit", ["100"])[0]
                try:
                    limit = int(raw_limit)
                except ValueError:
                    write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_LIMIT", "limit 必须是整数")})
                    return
                write_json(self, HTTPStatus.OK, {"messages": STORE.history(int(user["id"]), limit), "retention_days": 30})
            return
        if route.path == "/api/memory":
            user = account_required(self)
            if user:
                write_json(self, HTTPStatus.OK, {"memories": STORE.list_memories(int(user["id"]))})
            return
        if route.path == "/mock-audio/demo.wav":
            write_wav(self)
            return
        write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "资源不存在")})

    def do_POST(self) -> None:  # noqa: N802
        route = urlsplit(self.path).path
        user = account_user(self)
        if route == "/api/auth/login":
            if not authorized(self):
                auth_error(self)
                return
        elif route == "/api/admin/users":
            if not admin_required(self):
                return
        elif route in {"/api/chat", "/api/asr", "/api/tts"}:
            if not user and (REQUIRE_ACCOUNT_AUTH or not authorized(self)):
                auth_error(self)
                return
        elif route == "/api/auth/logout":
            if not account_required(self):
                return
        elif route == "/api/memory":
            if not account_required(self):
                return
        elif not authorized(self):
            auth_error(self)
            return
        if not SLOTS.acquire(blocking=False):
            write_json(self, HTTPStatus.TOO_MANY_REQUESTS, {"error": error_payload("BUSY", "MVP 服务当前达到并发上限")})
            return
        try:
            if route == "/api/auth/login":
                self.handle_login()
            elif route == "/api/auth/logout":
                self.handle_logout()
            elif route == "/api/admin/users":
                self.handle_create_user()
            elif route == "/api/memory":
                self.handle_add_memory(user or account_user(self) or {})
            elif route == "/api/chat":
                self.handle_chat(user)
            elif route == "/api/asr":
                self.handle_asr()
            elif route == "/api/tts":
                self.handle_tts()
            else:
                write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})
        finally:
            SLOTS.release()

    def do_PATCH(self) -> None:  # noqa: N802
        route = urlsplit(self.path).path
        if route != "/api/memory" and not route.startswith("/api/memory/"):
            write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})
            return
        user = account_required(self)
        if user:
            self.handle_update_memory(user)

    def do_DELETE(self) -> None:  # noqa: N802
        route = urlsplit(self.path).path
        if route == "/api/history":
            user = account_required(self)
            if user:
                self.handle_delete_history(user)
            return
        if route.startswith("/api/memory/"):
            user = account_required(self)
            if user:
                self.handle_delete_memory(user, route.rsplit("/", 1)[-1])
            return
        write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})

    def handle_login(self) -> None:
        payload = read_json(self) or {}
        username = payload.get("username")
        password = payload.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or not username.strip() or not password:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_CREDENTIALS", "username 和 password 为必填项")})
            return
        user = STORE.authenticate(username, password)
        if not user:
            write_json(self, HTTPStatus.UNAUTHORIZED, {"error": error_payload("INVALID_CREDENTIALS", "用户名或密码错误")})
            return
        token, expires_at = STORE.create_session(int(user["id"]))
        write_json(self, HTTPStatus.OK, {"access_token": token, "token_type": "Bearer", "expires_at": expires_at, "user": user})

    def handle_logout(self) -> None:
        token = bearer_token(self)
        if token:
            STORE.revoke_token(token)
        write_json(self, HTTPStatus.OK, {"ok": True})

    def handle_create_user(self) -> None:
        payload = read_json(self) or {}
        username = payload.get("username")
        password = payload.get("password")
        role = payload.get("role", "user")
        if not isinstance(username, str) or not isinstance(password, str) or not isinstance(role, str):
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_USER", "username、password 和 role 格式无效")})
            return
        try:
            user = STORE.create_user(username, password, role)
        except ValueError as error:
            status = HTTPStatus.CONFLICT if "已存在" in str(error) else HTTPStatus.BAD_REQUEST
            write_json(self, status, {"error": error_payload("INVALID_USER", str(error))})
            return
        write_json(self, HTTPStatus.CREATED, {"user": user})

    def handle_delete_history(self, user: dict[str, object]) -> None:
        payload = read_json(self) or {}
        before = payload.get("before")
        if before is not None and not isinstance(before, str):
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_DATE", "before 必须是 ISO 时间字符串")})
            return
        deleted = STORE.delete_history(int(user["id"]), before)
        write_json(self, HTTPStatus.OK, {"deleted": deleted})

    def memory_id(self) -> int | None:
        route = urlsplit(self.path).path
        value = route.rsplit("/", 1)[-1] if route != "/api/memory" else None
        try:
            return int(value) if value is not None else None
        except ValueError:
            return None

    def handle_add_memory(self, user: dict[str, object]) -> None:
        payload = read_json(self) or {}
        content = payload.get("content")
        confirmed = payload.get("confirmed") is True
        if not isinstance(content, str):
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY", "content 必须是字符串")})
            return
        try:
            memory = STORE.add_memory(int(user["id"]), content, confirmed)
        except PermissionError as error:
            write_json(self, HTTPStatus.PRECONDITION_REQUIRED, {"error": error_payload("CONFIRMATION_REQUIRED", str(error))})
            return
        except ValueError as error:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY", str(error))})
            return
        write_json(self, HTTPStatus.CREATED, {"memory": memory})

    def handle_update_memory(self, user: dict[str, object]) -> None:
        memory_id = self.memory_id()
        if memory_id is None:
            payload = read_json(self) or {}
            memory_id = payload.get("id") if isinstance(payload.get("id"), int) else None
            if memory_id is None:
                write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY_ID", "记忆 ID 必须是整数")})
                return
        else:
            payload = read_json(self) or {}
        content = payload.get("content")
        if not isinstance(content, str):
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY", "content 必须是字符串")})
            return
        try:
            memory = STORE.update_memory(int(user["id"]), memory_id, content, payload.get("confirmed") is True)
        except PermissionError as error:
            write_json(self, HTTPStatus.PRECONDITION_REQUIRED, {"error": error_payload("CONFIRMATION_REQUIRED", str(error))})
            return
        except ValueError as error:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY", str(error))})
            return
        if memory is None:
            write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "记忆不存在")})
            return
        write_json(self, HTTPStatus.OK, {"memory": memory})

    def handle_delete_memory(self, user: dict[str, object], raw_id: str) -> None:
        try:
            memory_id = int(raw_id)
        except ValueError:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_MEMORY_ID", "记忆 ID 必须是整数")})
            return
        if not STORE.delete_memory(int(user["id"]), memory_id):
            write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "记忆不存在")})
            return
        write_json(self, HTTPStatus.OK, {"deleted": True})

    def handle_chat(self, user: dict[str, object] | None = None) -> None:
        payload = read_json(self)
        text = str(payload.get("text", "")).strip() if payload else ""
        if not text or len(text) > 2000:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_TEXT", "text 必须为 1 到 2000 个字符")})
            return
        response: dict[str, object] = {
            "session_id": str(payload.get("session_id") or "demo-session"),
            "character_id": str(payload.get("character_id") or "arknights_fan_001"),
            "text": f"博士，我收到你的消息了：{text}",
            "emotion": "smile",
            "motion": "idle",
            "audio_url": None,
            "audio_base64": None,
            "mime_type": "audio/wav",
            "duration_ms": 180,
            "error": None,
        }
        try:
            tts = call_json(f"{PRIMARY_TTS_URL}/api/tts", {"text": response["text"], "voice_id": "mock", "emotion": response["emotion"]})
            response.update({key: tts.get(key) for key in ("audio_url", "audio_base64", "mime_type", "duration_ms")})
            response["audio_url"] = None
            if not response.get("audio_base64"):
                raise RuntimeError("TTS 响应没有音频")
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, RuntimeError):
            try:
                response.update(fallback_audio())
                response["error"] = error_payload("TTS_PRIMARY_UNAVAILABLE", "主 TTS 不可用，已使用 VM-1 备用 Mock TTS")
            except RuntimeError:
                response.update({"audio_url": None, "audio_base64": None, "mime_type": "audio/wav", "duration_ms": 0})
                response["error"] = error_payload("TTS_UNAVAILABLE", "主 TTS 和备用 TTS 均不可用，已保留字幕")
        if user:
            language = str(payload.get("language") or "zh-CN")[:20]
            session_id = str(response["session_id"])
            STORE.add_message(int(user["id"]), session_id, "user", text, language)
            STORE.add_message(int(user["id"]), session_id, "assistant", str(response["text"]), language)
        write_json(self, HTTPStatus.OK, response)

    def handle_tts(self) -> None:
        payload = read_json(self)
        text = str(payload.get("text", "")).strip() if payload else ""
        if not text:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_TEXT", "text 不能为空")})
            return
        try:
            audio = fallback_audio()
        except RuntimeError:
            write_json(self, HTTPStatus.SERVICE_UNAVAILABLE, {"error": error_payload("TTS_UNAVAILABLE", "备用 TTS 不可用")})
            return
        write_json(self, HTTPStatus.OK, audio | {"error": None})

    def handle_asr(self) -> None:
        is_multipart = self.headers.get("Content-Type", "").lower().startswith("multipart/form-data")
        payload = read_multipart(self) if is_multipart else read_json(self)
        if not payload:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_AUDIO", "请求必须包含 JSON 音频对象")})
            return
        try:
            if is_multipart:
                audio = payload.get("file")
                if not isinstance(audio, bytes) or not audio:
                    raise ValueError("empty audio")
                result = call_multipart(f"{PRIMARY_ASR_URL}/api/asr", audio, str(payload.get("language") or "zh-CN"))
            else:
                result = get_json(f"{PRIMARY_ASR_URL}/api/health")
                if result.get("status") != "ok":
                    raise RuntimeError("ASR 不可用")
                result = {"text": str(payload.get("text") or "博士，今天有什么任务？"), "provider": "mock", "confidence": 1.0, "error": None}
            write_json(self, HTTPStatus.OK, result)
        except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, RuntimeError, ValueError):
            write_json(self, HTTPStatus.SERVICE_UNAVAILABLE, {"error": error_payload("ASR_UNAVAILABLE", "ASR 服务不可用，请切换文本输入")})


if __name__ == "__main__":
    serve(Handler, PORT)
