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

VM-2 的 ASR 接口。客户端真实录音使用 `multipart/form-data`，字段为 `file`（音频内容）和 `language`（如 `zh-CN` 或 `ja-JP`）；MVP 测试继续兼容 JSON 音频对象和 `text` fixture。成功响应包含 `text`、`provider`、`confidence` 和 `error`，服务不可用时返回 HTTP 503 和 `ASR_UNAVAILABLE`。当前仓库实现仍是 Mock provider，不代表真实供应商已接入。

## 冻结枚举

情绪：`neutral`、`smile`、`serious`、`worried`、`sad`、`surprised`、`thinking`、`confident`。

动作：`idle`、`greeting`、`nod`、`shake`、`think`、`encourage`、`battle_ready`。

## 鉴权和限制

MVP 支持可选的 `Authorization: Bearer <API_TOKEN>`。部署时若 `API_TOKEN` 为空则仅用于内网/本机演示；公网 HTTPS 使用前必须设置非空令牌。请求体默认不超过 5 MiB，orchestrator 同时处理不超过 2 个业务请求。

## 账号、历史和记忆（P0-3 最小实现）

账号注册不开放。首次管理员由服务启动时读取 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 引导创建；之后由管理员调用 `POST /api/admin/users` 建立普通账号。密码只保存为 PBKDF2-SHA256 哈希，服务端不接受客户端提交 `user_id`。

当 `REQUIRE_ACCOUNT_AUTH=1` 时，`/api/chat`、`/api/asr` 和 `/api/tts` 需要账号会话；默认值为 `0`，用于保留现有匿名 Mock 联调。账号会话使用 `Authorization: Bearer <access_token>`，服务令牌仍可通过 `X-API-Token` 或旧的 Bearer 形式兼容传入。账号会话优先用于绑定历史。

### POST /api/auth/login

请求：`{ "username": "alice", "password": "..." }`

响应：`{ "access_token": "...", "token_type": "Bearer", "expires_at": "...", "user": { "id": 1, "username": "alice", "role": "user" } }`。令牌默认 24 小时有效，服务端只保存令牌 SHA-256 摘要。

### POST /api/auth/logout

需要账号会话。响应 `{ "ok": true }`，注销后该令牌立即失效。

### POST /api/admin/users

需要管理员账号会话。请求：`{ "username": "alice", "password": "至少 8 个字符", "role": "user" }`。响应 HTTP 201 和 `user` 对象；不允许重复用户名。

### GET /api/history

需要账号会话。返回 `{ "messages": [...], "retention_days": 30 }`。只返回当前账号最近 30 天记录，按原始顺序排列；`limit` 可选，服务端限制为 1 到 500。

### DELETE /api/history

需要账号会话。无 body 时删除当前账号全部历史；传 `{ "before": "ISO-8601 时间" }` 时只删除该时间之前的记录。响应 `{ "deleted": 2 }`。

### GET/POST/PATCH/DELETE /api/memory

需要账号会话。`GET /api/memory` 返回当前账号记忆；`POST /api/memory` 请求 `{ "content": "...", "confirmed": true }`；更新可用 `PATCH /api/memory/{id}`；删除使用 `DELETE /api/memory/{id}`。新增和修改若 `confirmed` 不是布尔值 `true`，返回 HTTP 428 `CONFIRMATION_REQUIRED`。记忆内容按账号隔离，删除后不再返回。

原始录音不写入聊天历史；当前 Mock 实现只保存聊天文本、语言、角色和会话 ID。备份传播、跨设备同步和真实供应商持久化仍未验证。
