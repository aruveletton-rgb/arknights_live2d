# TTS / ASR 指南（Mock MVP）

当前已实现标准库 Mock TTS/ASR Gateway，部署在 VM-2；VM-1 orchestrator 负责主 TTS 调用、备用 Mock TTS 和失败降级。

## 接口

- `GET /tts/api/health`：主 TTS 健康检查。
- `POST /tts/api/tts`：返回短 WAV 的 base64 数据。
- `GET /asr/api/health`：Mock ASR 健康检查。
- `POST /api/asr`：返回样例文本；服务不可用时客户端回到文本输入。

## 本地启动

```bash
python -m server.tts_gateway.app
python -m server.asr_gateway.app
```

生产部署使用 `deploy/vm2-tts/compose.yaml`。当前不接入真实供应商、不提交音色、不保存凭据；接入真实服务前必须重新审计授权、费用和限额。
