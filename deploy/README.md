# deploy

当前执行拓扑为两台 VM：`vm1-gateway/` 提供 Caddy、orchestrator 和备用 Mock TTS，`vm2-tts/` 提供主 Mock TTS、Mock ASR 和健康入口。`vm3-asr/`、`vm4-fallback/` 仅保留为历史目录，不属于当前部署范围。

可执行部署和回滚步骤见 `docs/SERVER_DEPLOYMENT.md`；生产环境变量必须先通过 `scripts/validate_deployment.py --production`。
