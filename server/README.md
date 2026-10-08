# server

MVP 服务端使用 Python 标准库实现，不需要额外 Python 包：

- `python -m server.orchestrator.app`：VM-1 编排、Mock LLM、主备 TTS 和 ASR 代理。
- `python -m server.tts_gateway.app`：VM-2 Mock TTS。
- `python -m server.asr_gateway.app`：VM-2 Mock ASR。

两台 VM 的推荐启动方式见 `deploy/vm1-gateway/` 和 `deploy/vm2-tts/` 的 Compose 文件。服务不加载本地模型；真实供应商接入必须经过新的授权和成本审计。
