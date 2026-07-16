# API 合同（计划书参考版）

> 状态：从项目计划书整理出的参考合同。正式集成前仍需由人员 3 主导、全员确认并冻结。

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
  "error": null
}
```

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

## 冻结枚举

情绪：`neutral`、`smile`、`serious`、`worried`、`sad`、`surprised`、`thinking`、`confident`。

动作：`idle`、`greeting`、`nod`、`shake`、`think`、`encourage`、`battle_ready`。

## 客户端兼容状态

当前客户端尚未遵守本合同，具体差异见 `API_CONTRACT_ALIGNMENT.md`。
