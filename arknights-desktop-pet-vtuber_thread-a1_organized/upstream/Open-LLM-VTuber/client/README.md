# Arknights VTuber Desktop Pet Client

This client is the desktop-pet presentation layer for an Arknights-style VTuber based on Open-LLM-VTuber backends. It owns the transparent desktop window, tray menu, character stage, state machine, text entry, settings persistence, `/api/chat` calls, Mock demo mode, and audio playback.

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

The Electron window starts transparent, frameless, always on top, and near the lower-right corner of the primary display. Drag the character area to move it. Use the tray menu for show/hide, settings, restart, and exit.

## Build And Package

```bash
npm run build
npm run package
```

The Windows installer is emitted under `client/release/`.

## Mock Mode

Mock mode does not need a backend service.

Ways to enable it:

- In the settings panel, turn on `Mock 模式`.
- Start with an environment variable:

```bash
set VITE_MOCK_CHAT=1
npm run dev
```

The top-right badge shows `Mock` when the UI is using local responses. Mock data covers `happy`, `thinking`, `confused`, `serious`, and `error`.

## Backend Integration

The real backend endpoint is:

```http
POST /api/chat
```

Set `后端服务地址` in the settings panel, for example:

```text
http://127.0.0.1:8000
```

The client sends:

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

Expected response:

```json
{
  "reply_text": "博士，今天的任务已经整理好了。",
  "emotion": "happy",
  "motion": "nod",
  "audio_url": "https://example.com/audio/reply.wav",
  "audio_base64": null,
  "duration_ms": 3200
}
```

`reply_text`, `emotion`, `motion`, and audio fields drive the character state machine. Request errors move the character to `error` and keep the client running.

## Replace The Live2D Model

Place Cubism files under:

```text
client/public/characters/<character_name>/
```

Then set `角色模型路径` to the model config path:

```text
/characters/<character_name>/<model>.model3.json
```

The current renderer validates that the model config can be loaded and falls back to the built-in placeholder if assets are missing. A production Live2D SDK/Pixi renderer can be added behind `src/renderer/live2d/Live2DRenderer.ts` without changing the rest of the app.

## Tests And Self Check

```bash
npm run test
npm run selfcheck
```

Covered areas:

- Character state machine transitions
- Mock response coverage
- Config persistence

## Troubleshooting

- `node` or `npm` is not recognized: install Node.js 20+ and reopen the terminal.
- Window is visible but no Live2D model appears: check `角色模型路径`; the placeholder is expected when no model exists.
- Backend mode fails: confirm the backend is reachable at `<后端服务地址>/api/chat` and CORS allows the Electron renderer origin.
- Audio does not play: verify `audio_url` is reachable or `audio_base64` is valid WAV/MP3 data; the text reply still displays if audio fails.
- Settings do not seem to apply: close and reopen settings, or clear app local storage in Electron DevTools.
