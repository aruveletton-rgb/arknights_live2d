# VM-1 Gateway

VM-1 部署 Caddy 和 orchestrator。默认本地演示入口为 `http://127.0.0.1:18080`，HTTPS 使用 `https://localhost:18443` 和 Caddy internal CA。正式部署前设置非空 `API_TOKEN`、`VM1_DOMAIN`，并将 `PRIMARY_TTS_URL`、`PRIMARY_ASR_URL` 指向 VM-2 的正式边缘地址。

```bash
cp .env.example .env
docker compose up -d --build
curl http://127.0.0.1:18080/api/health
```
