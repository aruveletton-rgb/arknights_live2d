# 三线程并行实施计划总览

- 另有 2 天版（2 台服务器、不设工时上限）：[`2day/README.md`](2day/README.md)。按 2 天执行时，排期、拓扑、工时与削减清单以 2 天版为准
- 版本：v1（2026-10-01）
- 上层计划：`docs/EXECUTION_PLAN.md`（任务 ID、阶段、决策截止日期以其为准）
- 现状依据：`audit/reports/2026-10-01-three-thread-work-report.md`

| 线程 | 负责人 | 实施计划 |
| --- | --- | --- |
| A：客户端 + Live2D + 角色包 | 1 号（A1）、2 号（A2） | [THREAD_A_IMPLEMENTATION_PLAN.md](THREAD_A_IMPLEMENTATION_PLAN.md) |
| B：编排 + API + LLM | 3 号 | [THREAD_B_IMPLEMENTATION_PLAN.md](THREAD_B_IMPLEMENTATION_PLAN.md) |
| C：TTS/ASR + 服务器部署 | 4 号 | [THREAD_C_IMPLEMENTATION_PLAN.md](THREAD_C_IMPLEMENTATION_PLAN.md) |

## 1. 并行原则

1. 合同先行：三线程都按第 3 节的工作假设（WA）开发。D2 冻结后，只修正与假设不同的部分。
2. 以 Mock 解耦：每个线程都给下游提供可本机运行的 Mock，S3 之前不等待对方的真实实现。
3. 共用样例：`server/common/fixtures/` 下的请求/响应样例同时用于 B 的接口测试、A1 的解析测试和 C 的网关测试。
4. 交接有日期：第 4 节的交接物到期未交付时，接收方继续用 Mock，并在周报中标为阻塞。

## 2. 当前阻塞与并行期处理

| 阻塞 | 截止 | 影响 | 决定前的做法 |
| --- | --- | --- | --- |
| D1 仓库定位 | 10-08 | 全部 | 按代码仓库方案工作。若改为说明仓库，新实现仓库保持相同目录结构，计划不变 |
| A1 构建与测试失败 | W0 | A1 全部 | A1-01 优先修复 |
| 嵌套目录未迁移（G-02） | 10-09 | A1、A2 | G-02 合并前不在嵌套目录上开新改动，避免迁移冲突 |
| 无 `develop` 与线程分支（G-06） | 10-12 | 全部 | 先在个人分支工作，G-06 后 rebase 到线程分支 |
| D2 合同 | 10-15 | A1、B、C | 按 WA-03 至 WA-09 开发 |
| D3 传输方式 | 10-15 | A1-06 | 按 WA-07：HTTP + 健康轮询 |
| D4 上游用法 | 10-15 | B | 默认自建轻量 orchestrator；B-01 在 10-12 前给结论 |
| D5 ASR 路线 | 10-15 | A1-10、C-04 | 按 WA-06：VM-3 云 ASR，经 VM-1 代理 |
| D6 Live2D 模型 | 10-19 | A1-07/08、A2-04 | 用 Live2D 官方免费样例开发，只放本机，不提交仓库 |
| D7 服务器资源 | 10-19 | C、B-09 | 按 2 vCPU / 1 GiB 设计内存上限 |
| D8 鉴权 | 10-15 | A1、B、C | 按 WA-08 |
| D9 许可证 | 10-08 | 发布 | 不影响开发 |
| O-01 外部账号（LLM Key、云 ASR Key） | 10-19 | B-05、C-04 | 拥有者提供；未提供前全部走 Mock，Edge TTS 不需要 Key |
| O-02 VM-1 域名 | 10-26 | C-09 | 4 号与拥有者确认；S3 前可用 HTTP 内测 |
| O-03 VM 登录权限与云防火墙（NSG）查看、修改权限 | 10-08 | C-01、H-09 | 拥有者授予 4 号；未授予前 C 只做本机开发，S4 顺延 |

## 3. 公共工作假设（WA）

以下是实施用的提案，不是冻结合同。D2 由 3 号主导冻结后，以 `docs/API_CONTRACT.md` v1.0 为准，三份实施计划同步修订。

### WA-01 服务、端口与路径

| 服务 | 主机 | 端口 | 代码目录 | 部署目录 |
| --- | --- | --- | --- | --- |
| orchestrator | VM-1 | 12393（Caddy 443 反代） | `server/orchestrator/` | `deploy/vm1-gateway/` |
| tts_gateway（主） | VM-2 | 8082 | `server/tts_gateway/` | `deploy/vm2-tts/` |
| asr_gateway | VM-3 | 8083 | `server/asr_gateway/` | `deploy/vm3-asr/` |
| tts_gateway（备）+ 健康检查 + 备份 | VM-4 | 8082 | 同上 | `deploy/vm4-fallback/` |
| 客户端 | 本地 | 开发 5173 | `upstream/Open-LLM-VTuber/client/` | — |

客户端默认后端改为 `http://127.0.0.1:12393`。公共 schema 与样例放在 `server/common/schemas/`、`server/common/fixtures/`，由 3 号维护。

### WA-02 技术栈

- 服务端：Python 3.11、FastAPI、uvicorn、httpx、pydantic v2、PyYAML、pytest；Docker 镜像基于 `python:3.11-slim`；依赖锁定精确版本。
- 客户端：沿用现有 Electron 34 + React 19 + Vite 6 + vitest。
- 每个 Python 容器 `mem_limit: 256m`；每台 VM 建议配 1 GiB swap（4 号评估）。

### WA-03 `POST /api/chat`（VM-1 公网）

请求（服务端忽略未知字段，客户端可继续携带 `client_state`）：

```json
{
  "session_id": "8d3c…（客户端首次启动生成的 UUID）",
  "character_id": "arknights_fan_001",
  "input_type": "text",
  "text": "今天有点累。",
  "enable_tts": true
}
```

响应：HTTP 200。降级时 `text` 仍有值，同时 `error` 非空。

```json
{
  "session_id": "8d3c…",
  "character_id": "arknights_fan_001",
  "text": "博士，辛苦了。先休息一下吧。",
  "emotion": "worried",
  "motion": "encourage",
  "audio_url": "https://<vm1>/api/audio/vm2/3f9a….mp3",
  "duration_ms": 2800,
  "error": null
}
```

- `input_type`：`text` | `voice`（语音已由 `/api/asr` 转成文字）。
- `audio_url`、`duration_ms` 可为 `null`。
- `audio_base64` 不再属于合同；客户端播放器可保留该能力，不影响合同。
- 客户端同样忽略未知字段。

### WA-04 枚举

- emotion：`neutral`、`smile`、`serious`、`worried`、`sad`、`surprised`、`thinking`、`confident`。
- motion：`idle`、`greeting`、`nod`、`shake`、`think`、`encourage`、`battle_ready`。
- 服务端出口校验：未知值改为 `neutral` / `idle`。客户端入口再校验一次（双保险）。
- 客户端内部状态（`speaking`、`error` 等）不出现在合同中。

### WA-05 错误对象与状态码

`error` 为 `null` 或 `{"code": "…", "message": "…"}`。

| code | HTTP | 场景 |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | 字段缺失或非法 |
| `UNAUTHORIZED` | 401 | 令牌缺失或错误 |
| `CHARACTER_NOT_FOUND` | 404 | 角色不存在 |
| `RATE_LIMITED` | 429 | 超过限速 |
| `OVERLOADED` | 503 | 并发达到上限 |
| `INTERNAL` | 500 | 未预期错误 |
| `LLM_UNAVAILABLE` | 200 | 返回兜底回复 |
| `LLM_BAD_OUTPUT` | 200 | LLM 输出无法解析，返回兜底回复或纯文本 |
| `TTS_UNAVAILABLE` | 200 | `audio_url = null` |
| `ASR_UNAVAILABLE` | 503 | `/api/asr`：VM-3 不可用或超时 |
| `ASR_EMPTY` | 200 | `/api/asr`：未识别到语音，`text` 为空串 |
| `AUDIO_NOT_FOUND` | 404 | `/api/audio/*`：音频不存在或已过期 |

4xx/5xx 的响应体为 `{"error": {"code", "message"}}`。

内部接口（VM-1 → VM-2/3/4）：provider 失败时网关返回 HTTP 503，code 为 `TTS_UNAVAILABLE` 或 `ASR_UNAVAILABLE`；输入非法返回 400 `BAD_REQUEST`；内部令牌错误返回 401。orchestrator 负责把内部 503 转换为上表的对外语义（chat 为 200 降级）。

### WA-06 语音输入与音频播放

语音输入：客户端 → VM-1 `POST /api/asr` → orchestrator 转发 VM-3 → 返回文字 → 客户端以 `input_type: "voice"` 调用 `/api/chat`。

- 请求：`multipart/form-data`，字段 `file`（WAV，16 kHz，单声道，16 bit，最长 30 秒，最大 1 MB），字段 `language`（默认 `zh-CN`）。客户端负责把录音转换为该格式。
- 响应：`{"text": "…", "provider": "…", "confidence": 0.91 或 null, "error": null}`。
- VM-3 不可用或超时：HTTP 503 + `ASR_UNAVAILABLE`，客户端提示并切换到文本输入。未识别到语音：HTTP 200 + `text: ""` + `ASR_EMPTY`。

音频播放：VM-2/VM-4 不暴露公网。orchestrator 把 TTS 结果改写为 `audio_url = {PUBLIC_BASE_URL}/api/audio/{node}/{audio_id}.mp3`（`node` 为 `vm2` 或 `vm4`），并代理 `GET` 请求到对应节点。`audio_id` 为 `sha256(voice_id|speed|emotion|text)` 前 32 位十六进制，只由 tts_gateway 计算并返回；orchestrator 原样透传，不自行计算。计算前先规范化：`voice_id`、`emotion` 取回退后的值，`speed` 格式化为两位小数，`text` 做 NFC 并去掉首尾空白。网关内部音频路径为 `GET /api/audio/{audio_id}.mp3`（需 `X-Internal-Token`），orchestrator 映射为对外的 `/api/audio/{node}/{audio_id}.mp3`。

### WA-07 健康检查与重连

- 所有服务提供 `GET /api/health`，不需要令牌。
- orchestrator 返回 `{"status": "ok"|"degraded"|"down", "service": "orchestrator", "version": "…", "llm": "ok", "tts": "ok", "asr": "ok"}`。
- 网关返回 `{"status": "…", "service": "tts_gateway", "version": "…", "provider": "edge_tts"}`。网关的 `/api/health` 只检查本进程和配置，不实际调用外部 provider，要求 1 秒内返回。orchestrator 探测各网关（超时 1 秒）后汇总出 `tts`、`asr` 字段。
- D3 默认方案：HTTP。客户端断线后按 1、2、4、8、16、30 秒退避轮询 `/api/health`，恢复后自动可用。

### WA-08 鉴权与网络边界

- 公网只开 VM-1 的 443；80 只用于 ACME 证书校验和跳转 https（C-09）。S3 内测可临时开 12393，NSG 来源限定为团队 IP。
- 客户端调用 `/api/chat`、`/api/asr`、`/api/characters` 时携带 `Authorization: Bearer <CLIENT_TOKEN>`。`/api/health` 和 `/api/audio/*` 免令牌，因为 `<audio>` 元素无法附带请求头；风险登记为“音频 ID 在已知原文时可被推算”。
- VM-1 调用 VM-2/3/4 时携带 `X-Internal-Token`；VM-2/3/4 防火墙只允许 VM-1 和 VM-4 的来源 IP。
- 内网服务的发布端口只绑定私网地址（compose 用 `${BIND_ADDR}:8082:8082`）。Docker 发布的端口会绕过 ufw，不能只靠 ufw 拦截；云防火墙（NSG）同时设置。
- CORS 允许 `http://127.0.0.1:5173`（开发）和打包后的 `null` / `file://` 来源（Electron 实际发送的 Origin 需验证）。CORS 也要覆盖 `GET /api/audio/*`：客户端用 `crossOrigin="anonymous"` 加载音频后才能接 `AnalyserNode` 做口型。实际安全控制靠令牌，不靠 CORS。
- 客户端令牌保存在设置里（MVP 用 localStorage，后续再评估 Electron `safeStorage`）。

### WA-09 角色、Prompt、音色与 LLM 输出

- 角色 YAML（2 号维护，3 号校验）在 README §8 的基础上增加 `voice_id` 和 `fallback_reply`。
- `character_pack/voices/voices.yaml`（2 号维护，4 号读取）：`voice_id` → provider 音色、语速、按 emotion 微调。
- LLM 输出约定（写进 `emotion_rules.md`）：只输出 JSON `{"text": "…", "emotion": "…", "motion": "…"}`。3 号负责解析和修正。
- `model_dict.json`（1、2 号共同维护）在示例字段之外增加 `motionMap`：冻结 motion → Cubism motion group 与 index。
- 回复长度：`persona.md`/`speech_style.md` 要求单条回复不超过 120 字。超过 `TTS_MAX_TEXT_CHARS`（默认 300）时，orchestrator 不调用 TTS，返回 `audio_url = null` 和 `TTS_UNAVAILABLE`，文字不截断。
- `voices.yaml` 的字段以 2 号确认的版本为准（H-07）；其他线程计划里的格式只是提案。
- 枚举规范化：orchestrator 对 LLM 输出的 emotion/motion 先 `strip().lower()` 再查白名单，所以对外只出现小写规范值；客户端按大小写敏感校验即可。
- 角色 YAML 增加可选 `knowledge_files`（相对 `character_pack/`），orchestrator 拼进 system prompt，合计上限 8 KB。YAML 和 `model_dict.json` 里的路径一律相对路径，不以 `/` 或 `character_pack/` 开头（打包后走 `file://`）。

### WA-10 环境变量名

| 服务 | 变量 |
| --- | --- |
| orchestrator | `LLM_PROVIDER`（`mock`/`openai_compatible`）、`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`、`LLM_TIMEOUT_S`、`TTS_PRIMARY_URL`、`TTS_FALLBACK_URL`、`ASR_GATEWAY_URL`、`INTERNAL_TOKEN`、`CLIENT_TOKEN`、`PUBLIC_BASE_URL`、`CHARACTER_PACK_DIR`、`DEFAULT_CHARACTER_ID`、`CORS_ORIGINS`、`SESSION_TTL_S`、`SESSION_MAX`、`MAX_CONCURRENCY`、`RATE_LIMIT_PER_MIN`、`LOG_USER_TEXT`、`TTS_CALL_TIMEOUT_S`、`ASR_CALL_TIMEOUT_S`、`TTS_MAX_TEXT_CHARS` |
| tts_gateway | `TTS_PROVIDER`（`mock`/`edge_tts`/…）、`TTS_CACHE_DIR`、`TTS_CACHE_TTL_H`、`TTS_CACHE_MAX_MB`、`TTS_TIMEOUT_S`、`TTS_MAX_TEXT_CHARS`、`TTS_MAX_CONCURRENCY`、`TTS_MOCK_FAULT`、`VOICE_MAP_FILE`、`INTERNAL_TOKEN` |
| asr_gateway | `ASR_PROVIDER`（`mock`/…）、`ASR_BASE_URL`、`ASR_API_KEY`、`ASR_REGION`、`ASR_TIMEOUT_S`、`ASR_MAX_CONCURRENCY`、`ASR_MOCK_TEXT`、`ASR_MOCK_FAULT`、`INTERNAL_TOKEN` |
| 部署（各 VM compose） | `BIND_ADDR`、`IMAGE_TAG`；VM-1 另有 `VM1_DOMAIN`（C-09） |
| 客户端（Vite） | `VITE_MOCK_CHAT`、`VITE_MOCK_ASR` |

Mock 模式统一用 `*_PROVIDER=mock` 开启，不另设 `*_MOCK_MODE` 开关。故障演练用 `TTS_MOCK_FAULT` / `ASR_MOCK_FAULT`（`none`|`fail`|`hang`，默认 `none`），只在 provider 为 `mock` 时生效。两个服务都有 `TTS_MAX_TEXT_CHARS`，取值必须相同（默认 300）。

所有真实值只放 `.env`（不提交）。仓库只提交 `.env.example`。

根目录 README §13.2 里的 `TTS_GATEWAY_URL`、`CHARACTER_ID` 由本表的 `TTS_PRIMARY_URL`/`TTS_FALLBACK_URL`、`DEFAULT_CHARACTER_ID` 取代。D2 冻结时一并修订 README。

`deploy/vm1-gateway/` 的分工：3 号维护 `compose.yaml`（服务名 `orchestrator`，端口 12393）和 `.env.example`（B-09）；4 号维护叠加文件 `compose.caddy.yaml`（服务名 `caddy`）、`Caddyfile` 和证书卷（C-09）。两个文件放在同一目录，用 `docker compose -f compose.yaml -f compose.caddy.yaml up -d` 一起启动，共用项目默认网络，caddy 通过 `orchestrator:12393` 访问。正式环境 `orchestrator` 只绑定 `127.0.0.1:12393`，公网只经 caddy 443 进入。

### WA-11 CI

每个线程维护自己的 workflow 文件，避免互相冲突：`.github/workflows/client.yml`（1 号，windows-latest，build + test）、`orchestrator.yml`（3 号，ubuntu，pytest + schema 校验）、`voice-ops.yml`（4 号，ubuntu，pytest + shellcheck）。`server/common/` 的 schema 和 fixtures 改动会同时触发 3 号、4 号的 workflow。

### WA-12 超时预算

规则：下游超时必须短于上游，网关先返回 503，orchestrator 才有时间切到 VM-4。

| 调用 | 超时（默认） | 变量 / 位置 |
| --- | --- | --- |
| 客户端 → `/api/chat` | 30 s | `requestTimeoutMs` |
| 客户端 → `/api/asr` | 20 s | `asrClient.ts` |
| 客户端 → `/api/health` | 3 s | `healthClient.ts` |
| orchestrator → LLM | 15 s | `LLM_TIMEOUT_S` |
| orchestrator → 每个 TTS 节点 | 6 s（连接 2 s） | `TTS_CALL_TIMEOUT_S` |
| tts_gateway → provider | 5 s | `TTS_TIMEOUT_S` |
| orchestrator → asr_gateway | 12 s | `ASR_CALL_TIMEOUT_S` |
| asr_gateway → 云 ASR | 10 s | `ASR_TIMEOUT_S` |
| orchestrator → 网关 `/api/health` | 1 s | 固定 |

`/api/chat` 最坏耗时 = 15 + 6 + 6 = 27 s < 30 s。数值在 S4 实测后调整；调整时整列一起改，保持上述大小关系。

## 4. 跨线程交接物

| ID | 内容 | 提供 | 接收 | 截止 |
| --- | --- | --- | --- | --- |
| H-01 | emotion/motion 枚举提案（A2-01） | 2 号 | 3 号、1 号 | 10-12 |
| H-02 | TTS/ASR 内部接口提案（请求响应、内部令牌、音频 ID、错误） | 4 号 | 3 号 | 10-12 |
| H-03 | 上游 Open-LLM-VTuber 调研结论（B-01） | 3 号 | 全员 | 10-12 |
| H-04 | 合同 v1.0 + JSON Schema + fixtures（B-02） | 3 号 | 1、2、4 号 | 10-15 |
| H-05 | 角色 YAML + 5 个 Prompt 初版（A2-02、A2-03） | 2 号 | 3 号 | 10-19 |
| H-06 | 开发用样例模型说明 + `model_dict.json` 开发版（A2-04） | 2 号 | 1 号 | 10-19 |
| H-07 | `voices.yaml` 初版 | 2 号 | 4 号 | 10-19 |
| H-08 | tts_gateway 可本机运行（含 mock provider）（C-02） | 4 号 | 3 号 | 10-19 |
| H-09 | 服务器核实结论（C-01）；VM-1 已装好 Docker | 4 号 | 3 号 | 10-12；10-23 |
| H-10 | orchestrator 本机 mock 模式可运行（B-03） | 3 号 | 1 号 | 10-20 |
| H-11 | asr_gateway 可本机运行（C-04） | 4 号 | 3 号、1 号 | 10-23 |
| H-12 | 各线程分支 CI 通过 + 线程审计 | 全员 | 拥有者 | 10-26 |
| H-13 | `deploy/vm1-gateway` compose（B-09） | 3 号 | 4 号 | 10-30 |

## 5. 周历

| 周 | 日期 | A1（1 号） | A2（2 号） | B（3 号） | C（4 号） |
| --- | --- | --- | --- | --- | --- |
以各线程计划 §7 为准，本表是汇总。

| 周 | 日期 | A1（1 号） | A2（2 号） | B（3 号） | C（4 号） |
| --- | --- | --- | --- | --- | --- |
| W0 | 10-01 ~ 10-07（假期，可选） | 本机验证 A1-01 修法 | A2-01 草稿；A2-05 开始 | B-01；B-02 起草 | H-02 草稿；C-01（O-03 到位才做） |
| W1 | 10-08 ~ 10-12（S0） | G-02、G-03、A1-01、G-08、A1-02、A1-03 | H-01；A2-05；A2-02/03 起草 | H-03；B-02 发 PR；B-03 骨架；B-08 鉴权部分 | C-01；H-02；C-08a；C-02 开始 |
| W2 | 10-13 ~ 10-19（S1/S2） | A1-04、A1-05、A1-06 单测；A1-07 试验 | A2-02、A2-03（H-05）；A2-04（H-06）；H-07 | 10-15 冻结 B-02（H-04）；B-03 业务（H-10）；B-08 限速；B-07 | C-02（H-08） |
| W3 | 10-20 ~ 10-26（S2） | D2 修订；A1-07；A1-08 | A2-06、A2-07 | B-04、B-05、B-06 开始 | C-03 + VM-1 装 Docker（H-09）；C-04（H-11） |
| W4 | 10-27 ~ 11-02（S3） | A1-08 ~ A1-10；集成 | 集成；Prompt 10 轮实测；录屏；用户文档 | B-06、B-10、B-09 文件（H-13）；集成 | C-05、C-06、C-07、C-08b；集成 |
| W5 | 11-03 ~ 11-09（S4） | A1-11；四服务器联调 | 干净机器验证；C-10 非作者验证；合规定稿 | B-09 实机；演练；长跑 | C-08c、C-09、C-10；演练 |
| W6 | 11-10 ~ 11-13（S5） | 验收取证 | 验收取证 | 验收取证 | 验收取证 |

合并顺序（README §16）：`thread-a-character` → `thread-c-voice-ops` → `thread-b-orchestrator` → `thread-a-desktop` → `develop`。

## 6. 对齐记录（2026-10-01）

三份计划 §10 的建议已经合并进第 3 节。没有直接采纳或仍未决的如下：

| 来源 | 建议 | 处理 |
| --- | --- | --- |
| C §10 #2 | `TTS_MOCK_MODE` / `ASR_MOCK_MODE` | 改为 `*_MOCK_FAULT`（只管故障注入）；mock 开关统一用 `*_PROVIDER=mock` |
| C §10 #1 | O-03 截止 10-05 | 改为 10-08（假期内无法保证授权）；C 在 W0 只做本机开发 |
| C 初稿 | VM-1 上共用一个 `compose.yaml` | 改为 B 的 `compose.yaml` + C 的 `compose.caddy.yaml` 叠加，两人互不改对方文件 |
| C 初稿 | 共用 `ci.yml` | 改为每线程一个 workflow（WA-11） |
| B §10 #9 | 新增 B-10 | 采纳，`EXECUTION_PLAN.md` 升为 v1.1 |
| A §10 #9 | 录屏不进仓库，审计记 sha256 | 三线程统一执行：截图可进 `audit/evidence/`，录屏和含样例模型的文件只记文件名、sha256、时长、位置 |
| A §10 #10 | Electron 打包后的 Origin | 未决，A1-04 实测后回填 WA-08 |
| C §10 #13 | NSG 默认放行同 VNet | 未决，C-01 核实后决定是否在 WA-08 写显式拒绝规则 |
| B §10 #10 | `character_id` 可省略等合同细则 | D2 评审确认 |

以后的修订：先改本文件第 3 节，再改受影响的线程计划，并在本表加一行。

## 7. 工时与容量

按上层计划假设每人每周约 10 h。

| 人 | 计划合计 | 超标周 | 削减后 | 说明 |
| --- | --- | --- | --- | --- |
| 1 号 | 58 h | W4 13 h | 约 10 h | A 计划 §7：`tapMotions` 后移；必要时口型保留随机版 |
| 2 号 | 45 h | 无 | — | 已含 Prompt 10 轮实测主导、C-10 非作者验证；W3、W5、W6 仍有约 13 h 余量，优先承接各线程取证 |
| 3 号 | 60 h | W4 14 h | 约 10 h | B 计划 §7：实测交给 2 号主导；熔断、B-09 本机验证后移 |
| 4 号 | 63 h | W4 13.5 h、W5 14 h | 约 11 h | C 计划 §7：无云 ASR Key 时只做 mock；演练分给 3 号；非作者验证交给 2 号 |

1、3、4 号都接近满载。任何一人连续两周超过 12 h，或某个交接物晚于截止日期 3 天以上，就在周会上重排 S3/S4 日期，不压缩验证项。
