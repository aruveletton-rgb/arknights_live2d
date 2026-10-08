"""Small stdlib-only helpers shared by the MVP HTTP services."""

import base64
import io
import json
import math
import os
import struct
import wave
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(5 * 1024 * 1024)))


def make_demo_wav() -> bytes:
    """Return a short valid WAV fixture generated without a binary asset."""
    sample_rate = 8000
    duration = 0.18
    frames = int(sample_rate * duration)
    data = bytearray()
    for index in range(frames):
        sample = int(7000 * math.sin(2 * math.pi * 440 * index / sample_rate))
        data.extend(struct.pack("<h", sample))
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(bytes(data))
    return buffer.getvalue()


DEMO_WAV = make_demo_wav()
DEMO_WAV_BASE64 = base64.b64encode(DEMO_WAV).decode("ascii")


def json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def write_json(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json_bytes(payload)
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(body)


def write_wav(handler: BaseHTTPRequestHandler) -> None:
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Content-Type", "audio/wav")
    handler.send_header("Content-Length", str(len(DEMO_WAV)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(DEMO_WAV)


def read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any] | None:
    raw_length = handler.headers.get("Content-Length", "0")
    try:
        length = int(raw_length)
    except ValueError:
        return None
    if length <= 0 or length > MAX_BODY_BYTES:
        return None
    try:
        value = json.loads(handler.rfile.read(length))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return value if isinstance(value, dict) else None


def error_payload(code: str, message: str) -> dict[str, Any]:
    return {"code": code, "message": message}


class QuietHandler(BaseHTTPRequestHandler):
    server_version = "ArknightsMVP/1.0"

    def log_message(self, format: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {format % args}", flush=True)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()


def serve(handler: type[BaseHTTPRequestHandler], port: int) -> None:
    server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    print(f"listening on 0.0.0.0:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
