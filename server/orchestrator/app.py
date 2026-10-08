import base64
import json
import os
import urllib.error
import urllib.request
from http import HTTPStatus
from threading import BoundedSemaphore

from server.common.http_utils import DEMO_WAV_BASE64, QuietHandler, error_payload, read_json, serve, write_json, write_wav


PORT = int(os.getenv("PORT", "8000"))
PRIMARY_TTS_URL = os.getenv("PRIMARY_TTS_URL", "http://tts:8082")
PRIMARY_ASR_URL = os.getenv("PRIMARY_ASR_URL", PRIMARY_TTS_URL.replace(":8082", ":8083"))
API_TOKEN = os.getenv("API_TOKEN", "").strip()
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "2"))
SLOTS = BoundedSemaphore(MAX_CONCURRENT)


def authorized(handler: QuietHandler) -> bool:
    if not API_TOKEN:
        return True
    return handler.headers.get("Authorization") == f"Bearer {API_TOKEN}"


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
        if self.path == "/api/health":
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
        if self.path == "/api/characters":
            write_json(self, HTTPStatus.OK, {"characters": [{"character_id": "arknights_fan_001", "display_name": "罗德岛风格同人桌宠", "live2d_model_name": "deferred"}]})
            return
        if self.path == "/mock-audio/demo.wav":
            write_wav(self)
            return
        write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "资源不存在")})

    def do_POST(self) -> None:  # noqa: N802
        if not authorized(self):
            write_json(self, HTTPStatus.UNAUTHORIZED, {"error": error_payload("UNAUTHORIZED", "缺少有效的 Bearer token")})
            return
        if not SLOTS.acquire(blocking=False):
            write_json(self, HTTPStatus.TOO_MANY_REQUESTS, {"error": error_payload("BUSY", "MVP 服务当前达到并发上限")})
            return
        try:
            if self.path == "/api/chat":
                self.handle_chat()
            elif self.path == "/api/asr":
                self.handle_asr()
            elif self.path == "/api/tts":
                self.handle_tts()
            else:
                write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})
        finally:
            SLOTS.release()

    def handle_chat(self) -> None:
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
        payload = read_json(self)
        if not payload:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_AUDIO", "请求必须包含 JSON 音频对象")})
            return
        try:
            result = get_json(f"{PRIMARY_ASR_URL}/api/health")
            if result.get("status") != "ok":
                raise RuntimeError("ASR 不可用")
            write_json(self, HTTPStatus.OK, {"text": str(payload.get("text") or "博士，今天有什么任务？"), "provider": "mock", "confidence": 1.0, "error": None})
        except (OSError, urllib.error.URLError, json.JSONDecodeError, RuntimeError):
            write_json(self, HTTPStatus.SERVICE_UNAVAILABLE, {"error": error_payload("ASR_UNAVAILABLE", "ASR 服务不可用，请切换文本输入")})


if __name__ == "__main__":
    serve(Handler, PORT)
