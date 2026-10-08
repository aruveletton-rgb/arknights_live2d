import os
from http import HTTPStatus

from server.common.http_utils import DEMO_WAV_BASE64, QuietHandler, error_payload, read_json, serve, write_json, write_wav


PORT = int(os.getenv("PORT", "8082"))
SERVICE_NAME = os.getenv("SERVICE_NAME", "tts_gateway")


class Handler(QuietHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/api/health":
            write_json(self, HTTPStatus.OK, {"status": "ok", "service": SERVICE_NAME, "provider": "mock", "cache": "memory"})
            return
        if self.path == "/mock-audio/demo.wav":
            write_wav(self)
            return
        write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "资源不存在")})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/tts":
            write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})
            return
        if os.getenv("MOCK_FAILURE", "0") == "1":
            write_json(self, HTTPStatus.SERVICE_UNAVAILABLE, {"error": error_payload("TTS_UNAVAILABLE", "Mock TTS 已按配置停止")})
            return
        payload = read_json(self)
        text = str(payload.get("text", "")).strip() if payload else ""
        if not text or len(text) > 1000:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_TEXT", "text 必须为 1 到 1000 个字符")})
            return
        write_json(
            self,
            HTTPStatus.OK,
            {
                "audio_url": "/mock-audio/demo.wav",
                "audio_base64": DEMO_WAV_BASE64,
                "mime_type": "audio/wav",
                "duration_ms": 180,
                "provider": "mock",
                "cache_hit": False,
                "error": None,
            },
        )


if __name__ == "__main__":
    serve(Handler, PORT)
