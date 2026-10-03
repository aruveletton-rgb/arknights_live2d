# API 合同对齐说明

## 计划书冻结格式

计划书的 `/api/chat` 响应核心字段为：

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "text": "博士，辛苦了。",
  "emotion": "worried",
  "motion": "encourage",
  "audio_url": null,
  "error": null
}
```

## 当前客户端格式

客户端 `src/renderer/types/chat.ts` 当前要求：

```json
{
  "reply_text": "博士，辛苦了。",
  "emotion": "happy",
  "motion": "nod",
  "audio_url": null,
  "audio_base64": null,
  "duration_ms": 2200
}
```

## 主要差异

| 项目 | 计划书 | 当前客户端 | 影响 |
|---|---|---|---|
| 回复文字字段 | `text` | `reply_text` | 直接接入会读取失败 |
| 会话与角色回传 | 必须 | 未定义 | 客户端无法校验响应归属 |
| 错误字段 | `error` | 依赖 HTTP 异常 | 业务错误处理不一致 |
| 音频内联 | 未要求 | `audio_base64` | 可保留为兼容扩展 |
| 时长 | metadata 或服务响应 | `duration_ms` | 可保留为兼容扩展 |
| 情绪枚举 | neutral/smile/serious/worried/sad/surprised/thinking/confident | neutral/happy/thinking/confused/serious/sad/error | 多项不一致 |
| 动作枚举 | idle/greeting/nod/shake/think/encourage/battle_ready | idle/nod/shake_head/wave/think/speak/alert | 多项不一致 |

## 合并前必须决策

1. 以 `docs/API_CONTRACT.md` 为唯一权威，客户端适配计划书字段。
2. 过渡期可让客户端解析 `text ?? reply_text`，但最终应删除双标准。
3. 情绪和动作必须改为冻结枚举，并实现未知值回退。
4. 请求体是否保留 `audio_base64`、`client_state`，需由线程 B 明确。
5. 错误必须既支持 HTTP 状态，也支持标准响应中的 `error` 字段。

本整理包只记录差异，没有擅自修改源码协议，以避免在接口尚未全员确认时制造新的事实标准。
