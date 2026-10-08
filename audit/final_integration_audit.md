# MVP 最终集成审计

- 审计时间：2026-10-08
- 执行窗口：2026-10-08 至 2026-10-09（本轮提前完成关键链路验证）
- 分支：`main`
- 基线提交：`97f6d06237614dc43ee19a7848b3f20d5ba35cfb`
- 总体状态：`pass`（第一阶段 MVP；生产硬化项另列）

## 范围与拓扑

- VM-1：HTTPS/Caddy、orchestrator、备用 Mock TTS。
- VM-2：主 Mock TTS、Mock ASR、Caddy 健康入口。
- 两台 VM：Ubuntu 22.04、2 vCPU、1 GiB。
- LLM、TTS、ASR 均为 Mock；真实供应商、Live2D 和 Windows 打包后置。
- VM-1 到 VM-2 的私网地址当前不互通。本轮演示使用临时 SSH 转发，容器通过 `host.docker.internal` 访问 VM-2；正式网络/VNet/NSG 配置未完成。

## 验收矩阵

| 编号 | 状态 | 证据与说明 |
| --- | --- | --- |
| AC-MVP-01 客户端启动 | `pass` | `npm run selfcheck` 构建和 8 个测试通过；`npm rebuild electron` 成功，Electron v34.5.8 进程窗口 `Arknights VTuber Pet` 响应正常。 |
| AC-MVP-02 客户端调用 VM-1 | `pass` | Playwright 驱动客户端后端模式发送文本，页面显示 VM-1 返回文本；网络记录为 `POST http://127.0.0.1:18080/api/chat => 200`。 |
| AC-MVP-03 Mock LLM 合同 | `pass` | VM-1 `/api/chat` 返回 `text`、`emotion`、`motion`、会话和错误字段。 |
| AC-MVP-04 Mock TTS 音频 | `pass` | VM-2 `/tts/api/health` 正常；聊天响应包含 Mock WAV base64。 |
| AC-MVP-05 Mock ASR | `pass` | VM-2 `/asr/api/health` 和 `/api/asr` 返回文本及 `confidence=1.0`。 |
| AC-MVP-06 TTS 失败保留字幕 | `pass` | 主 TTS 停止时切换 `mock-fallback`；主备同时失败时返回字幕、空音频和 `TTS_UNAVAILABLE`，HTTP 200。 |
| AC-MVP-07 ASR 失败回文本 | `pass` | 客户端 Mock ASR 成功请求为 200；停止 ASR 后收到 503，界面显示错误提示且文本框/发送按钮仍可用。 |
| AC-MVP-08 主备 TTS 切换 | `pass` | 主 TTS 故障演练后 VM-1 使用 `mock-fallback`，并在结束后恢复服务。 |
| AC-MVP-09 健康检查 | `pass` | VM-1、VM-2 健康接口和容器状态均正常；失败演练可区分 TTS/ASR。 |
| AC-MVP-10 两台 Compose | `pass` | 两台远程 Compose 已启动；容器均为 `Up`。 |
| AC-MVP-11 HTTP/HTTPS 入口 | `pass` | VM-1 `http://127.0.0.1:18080`、VM-2 HTTP 正常；`https://localhost` 使用 Caddy internal CA 正常。公网域名/IP 证书和令牌属于生产硬化项。 |
| AC-MVP-12 负载边界 | `pass` | 5 分钟持续压测共 1500 次请求，600 个 200、900 个 429、0 个网络/服务错误；P95 约 626 ms，最大约 1095 ms。CPU、容器内存和 850 MiB/85% 硬阈值均未超出；VM-1 主机可用内存最低约 231 MiB，记录为软性预留风险。 |
| AC-MVP-13 审计报告 | `pass` | 本 Markdown 与同名 JSON 已生成，结论和限制一致。 |

## 远程资源证据

### VM-1

- `free -m`：总内存 898 MiB，可用 261 MiB（最终快照）。
- 容器：`vm1-gateway-caddy-1`、`vm1-gateway-orchestrator-1` 均 `Up`。
- `docker stats --no-stream`：Caddy 41.51 MiB/120 MiB，orchestrator 20.71 MiB/360 MiB；CPU 均约 0.00–0.01%。
- `/api/health`：`status=ok`，`tts=ok`，`tts_fallback=ok`，`asr=ok`。

### VM-2

- `free -m`：总内存 894 MiB，可用 290 MiB（最终快照）。
- 容器：`edge`、`tts`、`asr` 均 `Up`。
- `docker stats --no-stream`：edge 18.7 MiB/90 MiB，ASR 17.67 MiB/140 MiB，TTS 16.37 MiB/180 MiB；CPU 均约 0.00–0.01%。
- TTS/ASR 健康接口均返回 `status=ok`。

## 验证命令摘要

- 本地：`npm install --no-audit --no-fund`、`npm rebuild electron`、`npm run selfcheck`、Python `py_compile`。
- 远程：`sudo -n docker ps`、`sudo -n docker stats --no-stream`、`free -m`、Caddy HTTP/HTTPS `curl`。
- 压力：VM-1 本机 5 线程、每秒一轮、持续 300 轮 POST `/api/chat`；结果 1500 请求、600 个 200、900 个 `429 BUSY`、0 个其他错误，P95 约 626 ms，最大约 1095 ms。
- 降级：停止主 TTS 后验证备用音频；停止 ASR 后验证 503；验证后已重新启动服务。
- 客户端：Electron 原生窗口启动；Playwright 后端文本对话和 Mock ASR 成功/失败回退均已验证。
- 双 TTS 故障：远程关闭 VM-2 TTS 并启用 VM-1 `FALLBACK_TTS_FAILURE=1`，返回 `TTS_UNAVAILABLE`、保留字幕且无音频；随后恢复 `FALLBACK_TTS_FAILURE=0`。
- 工作区：单一 worktree；`git diff --check` 无输出。

## 风险与后续

1. 正式联调前配置 Azure VNet/NSG/私网路由，移除 SSH 转发，并把 `PRIMARY_TTS_URL`、`PRIMARY_ASR_URL` 改为 VM-2 正式地址。
2. 为正式域名设置 `VM1_DOMAIN`、`VM2_DOMAIN`，配置真实证书或受信任的 ACME 证书；当前 `localhost` internal CA 只适合演示。
3. 设置非空 `API_TOKEN` 后再开放公网 HTTPS；当前部署 token 为空，仅适合内网/演示。
4. 持续压力已完成；正式环境仍需观察 VM-1 的可用内存预留，当前软性预留最低约 231 MiB。
5. Live2D、真实供应商和 Windows 打包保持 `deferred`，不计入本 MVP 通过条件。
