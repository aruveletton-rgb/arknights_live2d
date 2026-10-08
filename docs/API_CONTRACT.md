# API 合同（MVP v2.0）

> 状态：2026-10-07 已按 MVP 范围冻结。实现使用 Mock LLM/TTS/ASR，真实供应商后续接入。

## POST /api/chat

请求：

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "input_type": "text",
  "text": "今天有点累。",
  "enable_tts": true
}
```

响应：

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "text": "博士，辛苦了。先休息一下吧，我会在这里陪着你的。",
  "emotion": "worried",
  "motion": "encourage",
  "audio_url": null,
  "audio_base64": null,
  "mime_type": "audio/wav",
  "duration_ms": 180,
  "error": null
}
```

`error` 为 `null` 或 `{ "code": "SERVICE_UNAVAILABLE", "message": "..." }`。主 TTS 失败时仍返回 `text` 和备用音频；全部 TTS 失败时 `audio_url`、`audio_base64` 均可为 `null`。

## GET /api/characters

```json
{
  "characters": [
    {
      "character_id": "arknights_fan_001",
      "display_name": "罗德岛风格同人桌宠",
      "live2d_model_name": "arknights_fan_model"
    }
  ]
}
```

## GET /api/health

```json
{
  "status": "ok",
  "llm": "ok",
  "tts": "ok",
  "asr": "ok"
}
```

## POST /api/tts

VM-2 的 Mock TTS 接口。请求至少包含非空 `text`，响应包含 `audio_url`、`audio_base64`、`mime_type`、`duration_ms`、`provider`、`cache_hit` 和 `error`。

## POST /api/asr

VM-2 的 Mock ASR 接口。请求为 JSON 音频对象；MVP 测试可附带 `text` fixture。成功响应包含 `text`、`provider`、`confidence` 和 `error`，服务不可用时返回 HTTP 503 和 `ASR_UNAVAILABLE`。

## 冻结枚举

情绪：`neutral`、`smile`、`serious`、`worried`、`sad`、`surprised`、`thinking`、`confident`。

动作：`idle`、`greeting`、`nod`、`shake`、`think`、`encourage`、`battle_ready`。

## 鉴权和限制

MVP 支持可选的 `Authorization: Bearer <API_TOKEN>`。部署时若 `API_TOKEN` 为空则仅用于内网/本机演示；公网 HTTPS 使用前必须设置非空令牌。请求体默认不超过 5 MiB，orchestrator 同时处理不超过 2 个业务请求。
