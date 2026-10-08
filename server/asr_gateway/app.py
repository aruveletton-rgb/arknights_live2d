import os
from http import HTTPStatus

from server.common.http_utils import QuietHandler, error_payload, read_json, read_multipart, serve, write_json


PORT = int(os.getenv("PORT", "8083"))
SERVICE_NAME = os.getenv("SERVICE_NAME", "asr_gateway")


class Handler(QuietHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/api/health":
            write_json(self, HTTPStatus.OK, {"status": "ok", "service": SERVICE_NAME, "provider": "mock"})
            return
        write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "资源不存在")})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/asr":
            write_json(self, HTTPStatus.NOT_FOUND, {"error": error_payload("NOT_FOUND", "接口不存在")})
            return
        if os.getenv("MOCK_FAILURE", "0") == "1":
            write_json(self, HTTPStatus.SERVICE_UNAVAILABLE, {"error": error_payload("ASR_UNAVAILABLE", "Mock ASR 已按配置停止")})
            return
        if self.headers.get("Content-Type", "").lower().startswith("multipart/form-data"):
            payload = read_multipart(self)
            audio = payload.get("file") if payload else None
            if not isinstance(audio, bytes) or not audio:
                write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_AUDIO", "multipart 请求必须包含非空 file")})
                return
        else:
            payload = read_json(self)
        if not payload:
            write_json(self, HTTPStatus.BAD_REQUEST, {"error": error_payload("INVALID_AUDIO", "请求必须包含 JSON 音频对象")})
            return
        text = str(payload.get("text") or "博士，今天有什么任务？").strip()
        write_json(self, HTTPStatus.OK, {"text": text, "provider": "mock", "confidence": 1.0, "error": None})


if __name__ == "__main__":
    serve(Handler, PORT)
