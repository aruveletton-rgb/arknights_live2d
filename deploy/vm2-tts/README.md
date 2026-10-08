# VM-2 TTS

VM-2 部署主 Mock TTS、Mock ASR 和 Caddy 边缘入口。HTTP 路径为 `/tts/*`、`/asr/*`，HTTPS 默认使用 `https://localhost` 的 Caddy internal CA。

```bash
cp .env.example .env
docker compose up -d --build
curl http://127.0.0.1/tts/api/health
curl http://127.0.0.1/asr/api/health
```
