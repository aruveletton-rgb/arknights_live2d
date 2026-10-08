# Arknights VTuber Desktop Pet Client

This client is the desktop-pet presentation layer for the MVP backend. It owns the transparent desktop window, tray menu, placeholder character stage, state machine, text entry, settings persistence, `/api/chat` and `/api/asr` calls, Mock demo mode, and audio playback.

## Requirements

- Windows 10/11
- Node.js 20+ and npm
- A Live2D Cubism model is optional. Without one, the client shows a built-in placeholder operator.

## Install

```bash
cd client
npm install
```

## Development

```bash
npm run dev
```

The Electron window starts transparent, frameless, always on top, and near the lower-right corner of the primary display. Use the move handle in the top bar to drag the window; the character stage remains available for model interaction. Window position and size are saved and restored onto a visible display. Closing the window hides it to the tray; choose Exit from the tray menu to stop the process.

## Build And Package

```bash
npm run build
npm run package
# 本地 Electron 运行时和无签名开发安装包
npm run package:dev
```

The Windows installer and portable executable are emitted under `client/release/`.

## Mock Mode

Mock mode does not need a backend service.

Ways to enable it:

- In the settings panel, turn on `Mock 模式`.
- Start with an environment variable:

```bash
set VITE_MOCK_CHAT=1
npm run dev
```

The top-right badge shows `Mock` when the UI is using local responses. Mock data uses the frozen contract values `smile`, `thinking`, `worried`, `serious`, and `sad`.

## Backend Integration

The real backend endpoint is:

```http
POST /api/chat
```

Set `后端服务地址` in the settings panel, for example:

```text
http://127.0.0.1:18080
```

The client sends:

```json
{
  "session_id": "local-user-001",
  "character_id": "arknights_fan_001",
  "input_type": "text",
  "text": "博士，今天有什么任务？",
  "enable_tts": true
}
```

Expected response:

```json
{
  "session_id": "local-user-001",
  "character_id": "arknights_fan_001",
  "text": "博士，我收到你的消息了：博士，今天有什么任务？",
  "emotion": "smile",
  "motion": "idle",
  "audio_url": null,
  "audio_base64": "...",
  "mime_type": "audio/wav",
  "duration_ms": 180,
  "error": null
}
```

When `启用语音输入` is enabled, hold the microphone button to record and release it to send the recording to `POST /api/asr`; the returned text is placed into the input box. Mock mode keeps a deterministic fixture response. If microphone permission or ASR fails, the error is shown and text input remains available. `text`, `emotion`, `motion`, and audio fields drive the character state machine. Request errors move the character to `error` and keep the client running.

## Replace The Live2D Model

Place permitted Cubism files under:

```text
client/public/characters/<character_name>/
```

Then set `角色模型路径` to the model config path:

```text
/characters/<character_name>/<model>.model3.json
```

Packaged builds use relative resource URLs so model assets can load from `file://`. The current renderer still accepts only the repository's placeholder model metadata; it does not render Cubism. A production Live2D SDK/Pixi renderer requires the separately audited SDK and model license gate before implementation or redistribution.

## Tests And Self Check

```bash
npm run test
npm run selfcheck
```

Covered areas:

- Character state machine transitions
- Mock response coverage
- Config persistence
- Model dictionary validation and runtime emotion/motion fallback

## Troubleshooting

- `node` or `npm` is not recognized: install Node.js 20+ and reopen the terminal.
- Window is visible but no Live2D model appears: check `角色模型路径`; the placeholder is expected when no model exists.
- Backend mode fails: confirm the backend is reachable at `<后端服务地址>/api/chat` and CORS allows the Electron renderer origin.
- Audio does not play: verify `audio_url` is reachable or `audio_base64` is valid WAV/MP3 data; the text reply still displays if audio fails.
- Settings do not seem to apply: close and reopen settings, or clear app local storage in Electron DevTools.
