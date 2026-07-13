# 对话接口约定 v0.1

本文件是 1 号客户端与 2 号后端之间的共同约定。它描述双方交换什么信息，不要求非技术参与者理解具体实现。

> 状态：Phase 0 初稿，待 1 号和 2 号在 PR 中确认后冻结。当前仓库尚无对应实现或测试结果。

## 1. 一次对话怎样流动

```text
客户端发送文字或语音
→ 后端识别输入并生成回复
→ 后端返回文字、表情、动作和音频
→ 客户端显示、播放并驱动 Live2D
```

接口地址：

```http
POST /api/chat
```

## 2. 客户端发送的内容

```json
{
  "session_id": "local-user-001",
  "character_id": "operator_default",
  "input_type": "text",
  "text": "博士，今天有什么任务？",
  "audio_base64": null,
  "client_state": {
    "current_motion": "idle",
    "language": "zh-CN"
  }
}
```

| 字段 | 简单解释 | 必填规则 |
| --- | --- | --- |
| `session_id` | 标记同一轮连续对话 | 必填，不能放真实姓名 |
| `character_id` | 选择哪个角色配置 | 必填 |
| `input_type` | `text` 或 `audio` | 必填 |
| `text` | 用户输入的文字 | 文字输入时必填 |
| `audio_base64` | 语音数据 | 语音输入时使用，文字输入时为 `null` |
| `client_state` | 客户端当前状态 | 可选；后端不能依赖它完成核心回复 |

## 3. 后端成功返回的内容

```json
{
  "session_id": "local-user-001",
  "character_id": "operator_default",
  "reply_text": "博士，今天的任务已经整理好了。",
  "emotion": "happy",
  "motion": "nod",
  "audio_url": "https://example.com/audio/reply.wav",
  "audio_base64": null,
  "duration_ms": 3200,
  "error": null
}
```

| 字段 | 由谁处理 | 规则 |
| --- | --- | --- |
| `reply_text` | 1 号显示，2 号生成 | 成功响应必须有文字 |
| `emotion` | 1 号切表情，2 号生成 | 必须来自下方固定列表 |
| `motion` | 1 号播动作，2 号生成 | 必须来自下方固定列表 |
| `audio_url` | 1 号播放，2 号提供 | 与 `audio_base64` 至少一个可用；TTS 失败时可都为 `null` |
| `duration_ms` | 1 号可用于播放控制 | 未知时可为 `null` |
| `error` | 1 号显示，2 号说明 | 成功时为 `null` |

## 4. 固定的表情和动作

当前以两份独立人员计划书中共同使用的方案为准。

`emotion` 可选值：

```text
neutral
happy
thinking
confused
serious
sad
error
```

`motion` 可选值：

```text
idle
nod
shake_head
wave
think
speak
alert
```

安全默认值：无法判断表情时使用 `neutral`；无法判断动作时使用 `speak`，待机时使用 `idle`。

早期四人总计划中的 `smile`、`greeting` 等名称不再作为 v0.1 的正式值，避免客户端同时维护两套名称。

## 5. 失败时怎样返回

示例：TTS 失败但文字回复成功。

```json
{
  "session_id": "local-user-001",
  "character_id": "operator_default",
  "reply_text": "博士，语音服务暂时不可用，我先用文字回复。",
  "emotion": "error",
  "motion": "shake_head",
  "audio_url": null,
  "audio_base64": null,
  "duration_ms": null,
  "error": {
    "code": "TTS_UNAVAILABLE",
    "message": "语音服务暂时不可用"
  }
}
```

最低降级规则：

- LLM 失败：返回固定的简短文字和明确错误。
- TTS 失败：保留文字，两个音频字段为 `null`。
- ASR 失败：提示用户改用文字输入，不把空白内容交给 LLM。
- 未知表情或动作：客户端使用安全默认值。
- 网络断开：客户端提示并允许重试，不无限快速重连。

## 6. 修改本约定

任何字段、名称、枚举或失败行为的变更都必须：

1. 单独发起标题以 `[接口变更]` 开头的 PR。
2. 同时说明对客户端和后端的影响。
3. 给出旧版本是否仍能工作的说明。
4. 由 1 号和 2 号确认，仓库拥有者合并后生效。
