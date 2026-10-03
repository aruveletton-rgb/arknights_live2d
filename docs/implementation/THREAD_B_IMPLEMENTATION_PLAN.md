# 线程 B 实施计划（v1，2026-10-01）

- 2 天版排期：[`2day/THREAD_B_2DAY_PLAN.md`](2day/THREAD_B_2DAY_PLAN.md)（任务细节仍以本文为准）
- 负责人：3 号（线程 B：orchestrator + API 合同 + LLM）
- 上层计划：[`docs/EXECUTION_PLAN.md`](../EXECUTION_PLAN.md)；公共假设、阻塞、交接、周历：[`README.md`](README.md)（下称“总览”；WA-01 ~ WA-12、H-01 ~ H-13）。文中“README §N”指仓库根目录 README
- 现状依据：工作报告 §3.3：B 未开始；`server/`、`deploy/` 下只有 `.gitkeep`
- 状态：草案。D2、D4、D8 冻结（10-15）后修订
- B-01 的上游依赖结论来自网页抓取工具对上游 `pyproject.toml` 的摘要；内存未实测

## 1. 范围与完成定义

本线程任务：B-01 ~ B-10（B-10 为本计划新增，见 §10）；主导 D2 合同冻结；交接物 H-03、H-04、H-10、H-13。

| AC | B 的责任 | B 侧完成标准 |
| --- | --- | --- |
| AC-02 | 公网接口与鉴权（B-08、B-09） | 经 Caddy https 调 `/api/chat` 成功（与 C-09） |
| AC-04 | `/api/chat` 文本链路（B-03 ~ B-05） | 真实 LLM 返回合法回复；mock 模式离线可用 |
| AC-05 | `/api/asr` 代理（B-10） | 样例 WAV 经 VM-1 → VM-3 返回文字 |
| AC-06 | TTS 调用与音频代理（B-06） | 客户端能播放 `audio_url`（含 CORS） |
| AC-07/08 | emotion/motion 出口校验（B-03、B-05） | 对外只出现冻结枚举；10 轮实测合法率有记录（与 A2-03） |
| AC-09 | TTS 降级（B-06） | 停 VM-2、VM-4 后仍返回文字和表情，`audio_url = null` |
| AC-10 | ASR 降级（B-10） | 停 VM-3 后返回 503 `ASR_UNAVAILABLE` |
| AC-11 | `/api/health`（B-03） | 1 秒内返回，客户端轮询可用 |
| AC-12 | vm1 compose（B-09） | VM-1 上 `docker compose up -d` 后 health 为 ok |
| AC-14 | `docs/API_CONTRACT.md` v1.0、`server/orchestrator/README.md` | 已合并 |

另负责 IT-04（未知枚举回退）、IT-08（LLM 超时或 Key 无效时兜底）的服务端实现。

线程完成定义：

1. `pytest -q` 全部通过，`orchestrator.yml` CI 为绿（WA-11）；
2. 所有 `server/common/fixtures/` 通过 schema 校验；
3. `LLM_PROVIDER=mock` 时不联网可用（H-10）；
4. 1 小时长跑内存平稳（B-07）；
5. 仓库内无 `.env`、Key、令牌；日志默认不含用户原文；
6. 提交 `audit/thread_b_audit.{md,json}`（§9）。

不在范围：WebSocket（D3 改选时另行计划）、流式输出、会话持久化（重启丢失可接受）、本地部署 LLM、角色选择界面。

## 2. 依赖、阻塞与决定前做法

| 依赖 | 截止 | 影响 | 未就绪时怎么继续 |
| --- | --- | --- | --- |
| D1 仓库定位 | 10-08 | 全部 | 按代码仓库方案 |
| G-02 嵌套目录迁移 | 10-09 | `docs/API_CONTRACT.md` 的位置 | G-02 前只在个人分支新建 `server/orchestrator/app/` 等新文件，不碰嵌套目录 |
| G-06 线程分支 | 10-12 | 提交位置 | 先在个人分支，之后 rebase 到 `thread-b-orchestrator` |
| H-01 枚举 | 10-12 | B-02 | 按 WA-04 |
| H-02 内部接口 | 10-12 | B-02、B-06、B-10 | 按 C 计划 §6.1 |
| D2 合同（B 主导） | 10-15 | B-03 起的业务代码 | 10-15 前只写与字段无关的骨架：配置、错误处理、health、鉴权、日志（风险 R2） |
| D4 上游用法 | 10-15 | 全部 | 默认自建；B-01 在 10-12 前给结论 |
| D8 鉴权 | 10-15 | B-08 | 按 WA-08 |
| H-05 角色包 | 10-19 | B-04 真实数据 | 用 `tests/fixtures/character_pack/` 最小样例 |
| H-08 tts_gateway | 10-19 | B-06 联调 | `httpx.MockTransport` 单测；本机起 C 的 mock 网关 |
| H-11 asr_gateway | 10-23 | B-10 联调 | 同上 |
| O-01 LLM Key | 10-19 | B-05 实测、A2-03 10 轮 | mock LLM；需要 Key 的测试自动跳过 |
| H-09 VM-1 Docker | 10-23 | B-09 实机 | 本机 `docker compose` 验证 |
| C-09 / O-02 https | 10-26 后 | AC-02 | S3 用 `http://127.0.0.1:12393` |

## 3. 文件变更清单

路径按 G-02 迁移后的根目录结构。

| 路径 | 新建/修改 | 任务 ID | 说明 |
| --- | --- | --- | --- |
| `docs/UPSTREAM_EVALUATION.md` | 新建 | B-01 | H-03，一页结论 |
| `docs/API_CONTRACT.md` | 修改 | B-02 | v1.0（G-02 迁入的参考版） |
| `docs/API_CONTRACT_ALIGNMENT.md` | 修改 | B-02 | 改为“v1.0 与客户端现状差异”，供 A1-04 |
| `server/common/schemas/*.json` | 新建 | B-02 | `chat_request`、`chat_response`、`error`、`health`、`asr_response`、`characters`、`internal_tts`、`internal_asr`（JSON Schema 2020-12） |
| `server/common/fixtures/*.json` | 新建 | B-02 | 见 §4 B-02 |
| `server/common/README.md` | 新建 | B-02 | 命名规则、修改流程 |
| `server/orchestrator/app/main.py`、`__main__.py` | 新建 | B-03 | 应用工厂、路由注册、`python -m app` 入口 |
| `server/orchestrator/app/config.py` | 新建 | B-03 | 读 WA-10 变量，启动时校验 |
| `server/orchestrator/app/models.py`、`errors.py`、`logging_setup.py` | 新建 | B-03、B-08 | pydantic 模型、WA-05 错误、JSON 日志 |
| `server/orchestrator/app/routes/{chat,asr,audio,characters,health}.py` | 新建 | B-03、B-06、B-10 | 5 组路由 |
| `server/orchestrator/app/characters.py`、`prompting.py` | 新建 | B-04 | 角色包加载、system prompt 拼接 |
| `server/orchestrator/app/llm/{base,mock,openai_compatible,parse}.py` | 新建 | B-03、B-05 | provider 与输出解析 |
| `server/orchestrator/app/tts_client.py`、`asr_client.py` | 新建 | B-06、B-10 | 内部网关调用、主备切换 |
| `server/orchestrator/app/sessions.py` | 新建 | B-07 | 会话存储 |
| `server/orchestrator/app/security.py` | 新建 | B-08 | 令牌、限速、并发、CORS |
| `server/orchestrator/tests/` | 新建 | 全部 | §5；含 `fixtures/character_pack/` 最小样例 |
| `server/orchestrator/scripts/soak.py` | 新建 | B-07 | 长跑脚本（不进 CI） |
| `server/orchestrator/{requirements.txt,requirements-dev.txt,Dockerfile,.dockerignore,pytest.ini}` | 新建 | B-03、B-09 | 依赖用 `==` 锁定 |
| `server/orchestrator/README.md` | 修改 | B-03 | 本机运行、变量、mock 触发词、测试 |
| `deploy/vm1-gateway/compose.yaml`、`.env.example`、`README.md` | 新建/修改 | B-09 | H-13；`compose.caddy.yaml`、`Caddyfile` 归 C-09 |
| `.github/workflows/orchestrator.yml` | 新建 | B-03 | WA-11 |
| 根 `README.md` §13.2、§13.3 | 修改 | B-02 | 变量名换成 WA-10；启动命令改为 `python -m app` |
| `audit/thread_b_audit.{md,json}`、`audit/evidence/thread_b/` | 新建 | §9 | |

不改：客户端、`character_pack/`（2 号）、`server/tts_gateway/`、`server/asr_gateway/`、`deploy/vm2~vm4`、`scripts/`（4 号）。

## 4. 任务实施细节

### B-01 上游调研（3 h，依赖无，H-03 10-12）

已有结论（网页摘要，需在 W0 直接读一遍上游 `pyproject.toml` 原文核对）：

- Python `>=3.10,<3.13`；`torch`（非 darwin `>=2.6.0`）、`onnxruntime`、`sherpa-onnx`、`scipy`、`numpy<2` 是必装依赖。
- 全部 TTS/ASR 后端（azure-cognitiveservices-speech、edge-tts、elevenlabs、cartesia、pyttsx3、groq）都是必装，可选组只有 bilibili。运行时还依赖 anthropic、openai、mcp、letta-client。
- 推论（未实测）：直接使用上游后端，镜像和内存很可能超过 256m，不适合 2 vCPU / 1 GiB。

步骤：

1. 核对原文。
2. 可选：W0 有时间时用上游 Docker 镜像在本机测一次空闲内存（`docker stats`），否则写“未实测”。
3. 列出可以借鉴的部分：Prompt 组织方式、`model_dict.json` 格式、`/client-ws` 消息类型（D3 改选 WebSocket 时参考）。
4. 写 `docs/UPSTREAM_EVALUATION.md`：结论（推荐自建轻量 orchestrator）、依据（逐条带链接）、未验证项、对 D3/D4 的影响。

完成标准：1 页，每条结论有出处或标“未实测”。

### B-02 合同 v1.0（6 h，依赖 H-01、H-02、B-01，H-04 10-15）

`docs/API_CONTRACT.md` v1.0 目录：版本规则；鉴权；`POST /api/chat`；`POST /api/asr`；`GET /api/audio/{node}/{audio_id}.mp3`；`GET /api/characters`；`GET /api/health`；内部接口（C 计划 §6.1）；错误对象与状态码（WA-05）；枚举（WA-04）；超时（WA-12）；CORS；环境变量（WA-10）。

本计划补充的合同规则（见 §10）：

- `character_id` 可省略，省略时用 `DEFAULT_CHARACTER_ID`；响应里总是返回实际使用的 `character_id`。
- `text` 去首尾空白后 1 ~ 500 字；请求体 ≤ 16 KB；超限返回 400 `BAD_REQUEST`。
- `session_id` 匹配 `^[A-Za-z0-9_-]{8,64}$`（UUID 满足）。
- LLM 与 TTS 同时失败时，`error` 只放 `LLM_*`（文字问题比没有声音更重要）。
- 版本规则：新增可选字段为小版本，双方忽略未知字段，因此可以兼容；改名、删除字段或改变语义为大版本，需要受影响的人在 PR 中确认（README §24）。

fixtures（`server/common/fixtures/`，文件名前缀对应 schema）：`chat_request.text.json`、`chat_request.voice.json`、`chat_response.ok.json`、`chat_response.tts_unavailable.json`、`chat_response.llm_unavailable.json`、`error.unauthorized.json`、`error.rate_limited.json`、`asr_response.ok.json`、`asr_response.empty.json`、`error.asr_unavailable.json`、`health.ok.json`、`health.degraded.json`、`characters.ok.json`、`internal_tts.response.json`、`internal_asr.response.json`。

冻结流程：10-13 发 PR → 1、2、4 号评审 → 10-15 合并；到期未确认的条款按 WA 默认处理，并在 PR 中写明。同一 PR 修订根 README §13.2/§13.3。

验证：`pytest tests/test_fixtures_schema.py`（每个 fixture 按文件名前缀用对应 schema 校验）。完成标准：四人在 PR 中确认；所有 fixture 通过校验。

### B-03 orchestrator 骨架（8 h：骨架 3 h 在 D2 前，业务 5 h 在 D2 后；H-10 10-20）

依赖只用 WA-02 列出的包（FastAPI、uvicorn、httpx、pydantic v2、PyYAML）；dev 依赖加 pytest、jsonschema。

`config.py`：从环境变量读入 pydantic 模型。启动时校验，失败则打印缺失变量名并退出：

- `LLM_PROVIDER` 为 `mock` 或 `openai_compatible`；后者要求 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。
- `CLIENT_TOKEN` 为空时允许启动（本机联调），但每次启动打印醒目警告“鉴权已关闭”。
- `TTS_PRIMARY_URL` 或 `ASR_GATEWAY_URL` 非空时，`INTERNAL_TOKEN` 必须非空。
- `DEFAULT_CHARACTER_ID` 必须存在于角色包中（B-04）。

`/api/chat` 处理顺序：鉴权（B-08）→ 限速、并发（B-08）→ 校验请求（`ChatRequest`，`extra="ignore"`，忽略 `client_state` 等未知字段）→ 角色（404 `CHARACTER_NOT_FOUND`）→ 会话锁（B-07）→ 拼 prompt（B-04）→ LLM（B-05）→ 解析与枚举出口校验 → TTS（B-06）→ 写入会话 → 返回。响应字段齐全，`audio_url`、`duration_ms`、`error` 可为 `null`。

`/api/characters`：返回 `character_id`、`display_name`、`live2d_model_name`（参考版合同字段）。

`/api/health`：

- `llm`：mock 恒为 `ok`；`openai_compatible` 不调用 LLM，按最近 5 分钟调用记录：失败率 < 50% 为 `ok`，否则 `degraded`；最近 ≥ 3 次全部失败为 `down`。
- `tts`、`asr`：并发探测网关 `/api/health`（1 s 超时，结果缓存 5 s）。TTS 主备都 ok 为 `ok`，一个 ok 为 `degraded`，都不 ok 或未配置为 `down`。
- `status`：三项都 `ok` 为 `ok`；`llm` 为 `down` 为 `down`；其他为 `degraded`。
- 免令牌，目标 1 s 内返回（WA-07）。

错误处理（`errors.py`）：校验错误 → 400 `BAD_REQUEST`，message 只列字段名，不回显输入；未捕获异常 → 500 `INTERNAL`，日志记 `request_id` 和堆栈，响应不带堆栈。每个响应带 `X-Request-ID`。

mock LLM（`llm/mock.py`）：按用户文本哈希从 8 条固定回复中选一条（覆盖 8 个 emotion、7 个 motion）。以下前缀只在 `LLM_PROVIDER=mock` 时生效，用于联调和演练：

| 前缀 | 行为 | 覆盖 |
| --- | --- | --- |
| `/mock:bad_json` | 返回非 JSON 文本 | `LLM_BAD_OUTPUT` |
| `/mock:unknown_enum` | `emotion: "angry"`、`motion: "dance"` | IT-04 |
| `/mock:timeout` | 等待超过 `LLM_TIMEOUT_S` | IT-08 |
| `/mock:error` | 抛 provider 异常 | `LLM_UNAVAILABLE` |
| `/mock:long` | 返回 400 字 | 跳过 TTS（WA-09） |

启动方式：`uvicorn app.main:app --host 127.0.0.1 --port 12393 --workers 1`，或 `python -m app`（根 README §13.3 的 `python app.py` 改为后者）。必须单 worker：会话、限速、熔断状态都在进程内存中。

验证：`test_chat.py`、`test_health.py`、`test_errors.py`、`test_contract_responses.py`。完成标准：mock 模式下 1 号的客户端完成一次对话（H-10）。

### B-04 角色包加载（4 h，依赖 H-05；W2 先用测试样例）

`characters.py`：启动时读 `CHARACTER_PACK_DIR/characters/*.yaml`，用 pydantic 模型校验，错误全部收集后一起抛出 `CharacterPackError`，拒绝启动。

- 必填：`character_id`（与文件名一致）、`display_name`、`human_name`、`live2d_model_name`、`voice_id`、`fallback_reply`、`prompt_files`（非空）、`default_emotion`、`default_motion`、`allowed_emotions`、`allowed_motions`。可选：`character_name`、`knowledge_files`。
- `allowed_*` 必须是冻结枚举的子集；`default_*` 必须在 `allowed_*` 中。
- 路径相对 `character_pack/`（WA-09）：`resolve()` 后必须仍在角色包目录内（防路径穿越）；文件必须存在；`knowledge_files` 合计 ≤ 8 KB。
- MVP 不支持热加载，改角色包后重启容器。

`prompting.py`：system prompt = 按顺序拼接 `prompt_files` → `## 参考资料` + `knowledge_files` → 系统生成的一段“可用 emotion：…；可用 motion：…”（从 YAML 读取，枚举只有一个来源）。输出格式说明以 `emotion_rules.md` 为准，B 不重复写。

验证：`test_characters.py`（合法包；缺字段；非法枚举；id 与文件名不一致；`../` 路径；文件缺失；知识文件超限）；`test_real_pack.py`（真实角色包存在时校验，不存在时跳过）。

### B-05 LLM 适配与输出解析（6 h，依赖 B-03；实测依赖 O-01）

`llm/openai_compatible.py`：

```python
POST {LLM_BASE_URL}/chat/completions
Authorization: Bearer {LLM_API_KEY}
{"model": LLM_MODEL, "messages": [...], "temperature": 0.7, "max_tokens": 300}
```

- 取 `choices[0].message.content`。不使用 `response_format`（不是所有兼容服务都支持，需验证），JSON 输出靠 Prompt 和解析兜底。
- 超时 `LLM_TIMEOUT_S`（默认 15 s，WA-12），不重试。401/403/429/5xx、超时、响应结构不对 → `LLMError` → `LLM_UNAVAILABLE`。Key 不进日志。
- 历史消息中 assistant 一轮存规范化后的 JSON 字符串，让模型持续看到正确格式。

`llm/parse.py`：`parse_llm_output(raw: str, ch: Character) -> (text, emotion, motion, error_code | None)`

1. 去首尾空白和代码块标记，`json.loads`；失败时取第一个 `{` 到最后一个 `}` 再试一次。
2. 解析成功且 `text` 为非空字符串：emotion、motion 先 `strip().lower()`，不在 `allowed_*` 中则用 `default_*`（WA-09）。
3. 解析失败但原文非空：原文作为 `text`，emotion/motion 用默认值，`error = LLM_BAD_OUTPUT`。
4. 原文为空：`fallback_reply`，`error = LLM_BAD_OUTPUT`。
5. 文本合并多余空行；不截断（超长由 B-06 跳过 TTS）。

`LLM_UNAVAILABLE` 时：`text = fallback_reply`，emotion 为 `worried`（不在 `allowed_emotions` 中则用默认值），motion 为 `idle`；仍尝试 TTS（固定文本，第二次起命中缓存）。

验证：`test_llm_parse.py`（合法 JSON；代码块包裹；前后有说明文字；大写枚举；未知枚举；缺 `text`；纯文本；空串）；`test_llm_openai.py`（`httpx.MockTransport`：成功、401、429、500、超时、结构不对、请求体字段）；`test_llm_live.py`（`@pytest.mark.llm_live`，只在有 Key 时手动跑）。与 2 号做 10 轮实测，记录 JSON 合法率和枚举合法率（A2-03）。

### B-06 TTS 调用、主备切换、音频代理（6 h，依赖 B-03、H-02、H-08）

`tts_client.py`：`async def synthesize(text, voice_id, emotion) -> TTSResult | None`

- 跳过 TTS：`enable_tts = false`（不报错）；`len(text) > TTS_MAX_TEXT_CHARS`（`TTS_UNAVAILABLE`，WA-09）；两个 URL 都未配置（`TTS_UNAVAILABLE`）。
- 节点顺序：`vm2 = TTS_PRIMARY_URL`、`vm4 = TTS_FALLBACK_URL`。每个节点超时 `TTS_CALL_TIMEOUT_S`（6 s，连接 2 s，WA-12）。
- 503、超时、连接失败 → 试下一个节点；400 → 不重试，记 bug 日志；401 → 不重试，记配置错误日志（`INTERNAL_TOKEN` 不一致）。
- 成功：`audio_id` 原样透传（WA-06），先校验为 32 位十六进制，不符合视为失败；`audio_url = {PUBLIC_BASE_URL}/api/audio/{node}/{audio_id}.mp3`；`duration_ms` 取网关返回值。
- 简单熔断：节点失败后 30 s 内直接跳过该节点；health 探测成功时提前恢复。
- 全部失败：`audio_url = null`、`duration_ms = null`，`error` 为 `TTS_UNAVAILABLE`（已有 `LLM_*` 时保留 `LLM_*`，见 B-02）。

`routes/audio.py`：`GET /api/audio/{node}/{audio_id}.mp3`，免令牌（WA-08）。

- `node` 只接受 `vm2`、`vm4`；`audio_id` 必须是 32 位十六进制；不符合 → 404 `AUDIO_NOT_FOUND`。
- 用 httpx 流式代理到 `{node_url}/api/audio/{audio_id}.mp3`，带 `X-Internal-Token`，转发 `Range`；透传 200/206 和 `Content-Type`、`Content-Length`、`Content-Range`、`Accept-Ranges`、`Cache-Control`；上游 404 → 404 `AUDIO_NOT_FOUND`；上游不可达 → 503 `TTS_UNAVAILABLE`。
- CORS 由全局中间件覆盖此路由（WA-08），客户端 `AnalyserNode` 才能读到数据。
- 响应结束后关闭上游连接。

验证：`test_tts_client.py`（vm2 成功；vm2 503 → vm4；vm2 超时 → vm4；都失败 → `null`；熔断窗口；非法 `audio_id`；超长文本跳过；`enable_tts=false`）；`test_audio_proxy.py`（非法 node/id；上游 404；上游不可达；`Range` 转发；CORS 头）；本机按 C 计划 §5.3 联调。

### B-07 会话管理（3 h，依赖 B-03）

`sessions.py`：`SessionStore(max_sessions=SESSION_MAX, ttl_s=SESSION_TTL_S, max_turns=8)`

- 键 `(session_id, character_id)`；值为最多 16 条消息的 `deque`、`last_seen`、`asyncio.Lock`。
- `OrderedDict` 实现 LRU：访问时移到末尾，超过 `SESSION_MAX`（默认 500）弹出最旧的；过期（`SESSION_TTL_S` 默认 1800）在访问时检查，另有每 60 s 的后台清理。
- 同一会话的请求用锁串行，避免同时发送两条导致历史错乱。
- 估算：500 会话 × 16 条 × 约 1 KB ≈ 8 MB，在 256m 内。
- 会话只在内存中，重启丢失（MVP 可接受，README 中写明）。

验证：`test_sessions.py`（轮数上限；注入时钟测过期；LRU 淘汰；不同角色互不影响；同会话并发串行）。长跑 `scripts/soak.py`：mock LLM，1000 个会话、5000 次请求，期间用 `docker stats` 记录内存。完成标准：预热后增长 < 20 MiB，会话数不超过上限。长跑与 C 的资源测量（D-8）合并到 S4 执行。

### B-08 鉴权、限速、并发、CORS、日志（4 h，依赖 B-03、D8）

- 令牌：`/api/chat`、`/api/asr`、`/api/characters` 要求 `Authorization: Bearer <CLIENT_TOKEN>`，用 `hmac.compare_digest` 比较；缺失或错误 → 401 `UNAUTHORIZED`。`/api/health`、`/api/audio/*` 免令牌。
- 限速：令牌桶，按 `session_id` 每分钟 `RATE_LIMIT_PER_MIN`（默认 20）；按来源 IP 再加一层，上限为前者的 2 倍，防止换 `session_id` 绕过。超限 → 429 `RATE_LIMITED` + `Retry-After`。只有直连来源是回环或私网地址（Caddy 在 compose 网络内）时才信任 `X-Forwarded-For`。桶数量上限 5000，过期清理。
- 并发：`asyncio.Semaphore(MAX_CONCURRENCY)`（默认 4）包住 chat 和 asr 处理，等待超过 2 s → 503 `OVERLOADED`。
- CORS：`CORSMiddleware`，`allow_origins = CORS_ORIGINS`（逗号分隔，默认 `http://127.0.0.1:5173,null`），方法 `GET, POST, OPTIONS`，头 `Authorization, Content-Type`。Electron 打包后实际的 Origin 由 A1-04 实测（A 计划 §10 第 10 条）。
- 请求体大小：chat ≤ 16 KB；asr ≤ 1 MB + 64 KB（multipart 开销）；超限 → 400 `BAD_REQUEST`。
- 日志：JSON 行写 stdout，字段 `ts`、`request_id`、`path`、`status`、`latency_ms`、`session_hash`（sha256 前 8 位）、`llm_ms`、`tts_ms`、`tts_node`、`error_code`。`LOG_USER_TEXT=false`（默认）时不记录用户和回复原文；任何时候都不记录令牌和 Key。

验证：`test_security.py`（无令牌 401；错令牌 401；令牌为空时放行并告警；第 21 次请求 429；并发超限 503；CORS 预检；超大请求体 400）；`test_logging.py`（默认日志不含用户原文和令牌）。

### B-09 VM-1 部署（3 h，依赖 B-03、H-09；H-13 10-30）

`server/orchestrator/Dockerfile`：`python:3.11-slim`；`pip install --no-cache-dir -r requirements.txt`；非 root 用户；`HEALTHCHECK` 用 `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:12393/api/health', timeout=2)"`；`CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "12393", "--workers", "1"]`。

`deploy/vm1-gateway/compose.yaml`：

```yaml
services:
  orchestrator:
    build: ../../server/orchestrator
    image: arknights/orchestrator:${IMAGE_TAG:-dev}
    env_file: .env
    environment:
      CHARACTER_PACK_DIR: /app/character_pack
    volumes:
      - ../../character_pack:/app/character_pack:ro
    ports:
      - "${BIND_ADDR:-127.0.0.1}:12393:12393"
    mem_limit: 256m
    restart: unless-stopped
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }
```

- `.env.example`：WA-10 的 orchestrator 变量全部列出，值为占位符，每个变量一行注释；`PUBLIC_BASE_URL` 在 VM-1 上填 `https://<vm1-host>`。
- S3 内测临时设 `BIND_ADDR=0.0.0.0`，NSG 来源限定团队 IP（WA-08）；S4 改回 `127.0.0.1`，由 4 号的 `compose.caddy.yaml` 叠加启动。

验证：本机 `docker compose up -d --build` 后 `curl http://127.0.0.1:12393/api/health`；`docker stats --no-stream` 记录空闲内存；VM-1 上重复一次（H-09 后）；与 C-09 叠加后经 https 访问。

### B-10 `/api/asr` 代理（3 h，依赖 B-03、H-02、H-11；本计划新增）

- 鉴权、限速、并发同 B-08。
- 读取 multipart：`file` 必填，按字节计数，超过 1 MB 立即停止读取并返回 400；`language` 默认 `zh-CN`。不在 orchestrator 解析 WAV（由 asr_gateway 校验，避免两处规则不一致）。
- 转发到 `ASR_GATEWAY_URL/api/asr`，带 `X-Internal-Token`，超时 `ASR_CALL_TIMEOUT_S`（12 s，WA-12）。
- 映射：200 透传 `text`、`provider`、`confidence`、`error`（含 `ASR_EMPTY`）；400 透传 message；503、超时、连接失败、内部 401（配置错误）、`ASR_GATEWAY_URL` 未配置 → 503 `ASR_UNAVAILABLE`（WA-05）。
- 不落盘，日志只记字节数和耗时。

验证：`test_asr_proxy.py`（`httpx.MockTransport`：成功；`ASR_EMPTY`；400 透传；503；超时；未配置；超大文件；无令牌）。

## 5. 测试计划

### 5.1 单元测试（pytest，`server/orchestrator/tests/`）

| 文件 | 任务 | 要点 |
| --- | --- | --- |
| `test_fixtures_schema.py` | B-02 | 所有 `server/common/fixtures/` 按前缀通过 schema |
| `test_config.py` | B-03 | 缺变量退出；令牌为空告警；`DEFAULT_CHARACTER_ID` 不存在退出 |
| `test_chat.py` | B-03 | 正常；未知枚举修正；`enable_tts=false`；超长文本跳过 TTS；未知字段忽略；400/404 |
| `test_health.py` | B-03 | 汇总规则；探测超时；5 s 缓存；免令牌 |
| `test_errors.py` | B-03 | 400 不回显输入；500 不带堆栈；`X-Request-ID` |
| `test_characters.py`、`test_real_pack.py` | B-04 | 见 B-04 |
| `test_llm_parse.py`、`test_llm_openai.py` | B-05 | 见 B-05 |
| `test_tts_client.py`、`test_audio_proxy.py` | B-06 | 见 B-06 |
| `test_sessions.py` | B-07 | 见 B-07 |
| `test_security.py`、`test_logging.py` | B-08 | 见 B-08 |
| `test_asr_proxy.py` | B-10 | 见 B-10 |

`pytest.ini` 注册标记 `llm_live`；`test_real_pack.py` 在角色包缺失时自动跳过。

### 5.2 合同测试

- `test_fixtures_schema.py` 保证样例本身合法。
- `test_contract_responses.py`：mock 模式下实际调用 `/api/chat`（正常、`TTS_UNAVAILABLE`、`LLM_UNAVAILABLE`、未知枚举、`/mock:bad_json`）和错误路径，用 schema 校验真实响应。
- 同一套 fixtures 被 A1 的 `contract.test.ts` 和 C 的网关测试使用（总览 §1 第 3 条）。

### 5.3 本机联调（S3，按 C 计划 §5.3 起 4 个进程）

| IT | B 侧做法 |
| --- | --- |
| IT-01 | mock 或真实 LLM，文本对话 |
| IT-02 | 本机 tts_gateway（mock 或 edge_tts） |
| IT-03 | 本机 asr_gateway（mock）+ 客户端录音 |
| IT-04 | 发送 `/mock:unknown_enum` |
| IT-05 | `TTS_MOCK_FAULT=fail` 或停掉两个 tts 进程 |
| IT-06 | 停 asr 进程 |
| IT-07 | 停 orchestrator 30 s 后重启 |
| IT-08 | `/mock:timeout`；或 `LLM_PROVIDER=openai_compatible` 配无效 Key |

### 5.4 CI（`.github/workflows/orchestrator.yml`）

ubuntu-latest，Python 3.11；`pip install -r requirements-dev.txt`；`pytest -q -m "not llm_live"`。触发路径：`server/orchestrator/**`、`server/common/**`、`character_pack/**`、该 workflow 文件本身。

## 6. 对外交付与 Mock

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-03 | `docs/UPSTREAM_EVALUATION.md` | 10-12 | 全员阅读，D4 会上确认 |
| H-04 | 合同 v1.0 + schemas + fixtures | 10-15 | 1、2、4 号在 PR 中确认；fixtures 校验通过 |
| H-10 | orchestrator 本机 mock 模式 | 10-20 | 1 号客户端对本机 12393 完成一次对话 |
| H-13 | `deploy/vm1-gateway/compose.yaml` + `.env.example` | 10-30 | 4 号叠加 `compose.caddy.yaml` 启动成功 |
| — | mock LLM 触发词（B-03 表） | 随 H-10 | 1 号复现 IT-04、IT-08 |
| — | Prompt 10 轮实测记录 | O-01 后 | 与 2 号共同填写 `dialogue_cases.md` |

H-10 本机运行（写入 `server/orchestrator/README.md`）：

```bash
cd server/orchestrator
python -m venv .venv && . .venv/bin/activate      # Windows：.venv\Scripts\activate
pip install -r requirements-dev.txt
LLM_PROVIDER=mock CHARACTER_PACK_DIR=../../character_pack DEFAULT_CHARACTER_ID=arknights_fan_001 \
  PUBLIC_BASE_URL=http://127.0.0.1:12393 python -m app
```

PowerShell 写法另列。本线程接收：H-01、H-02、H-05、H-08、H-09、H-11、O-01。

## 7. 周计划（3 号，单位 h，目标每周约 10 h）

| 周 | 任务 | h |
| --- | --- | --- |
| W0（假期，可选） | B-01 3；B-02 起草 2 | 5 |
| W1 | B-02 4（10-13 发 PR）；B-03 骨架 3；B-08 鉴权/CORS/日志 2；H-02 评审 1 | 10 |
| W2 | B-02 冻结与修订 1；B-03 业务 5（H-10）；B-08 限速/并发 2；B-07 2 | 10 |
| W3 | B-04 4；B-05 4；B-06 客户端与切换 2 | 10 |
| W4（S3） | B-06 音频代理与联调 4；B-10 3；B-05 实测 2；B-09 本机 2；S3 集成 3 | **14** ⚠ |
| W5（S4） | B-09 实机 1；S4 联调与演练 4；B-07 长跑 1 | 6 |
| W6（S5） | 取证与审计 3；遗留修复 2 | 5 |
| 合计 | | 60 |

W4 超 4 h，按序削减：

1. B-05 的 10 轮实测由 2 号主导，3 号只看结果（−1 h）；
2. B-06 熔断推迟到 W5（−0.5 h），W4 期间每次都先试 VM-2；
3. B-09 本机验证挪到 W5 开头（−2 h，H-13 截止 10-30 不变，需在 W4 周四前给出文件，验证可在 W5 补）；
4. B-10 先只做透传与状态映射，大小预检挪到 W5（−0.5 h）。

全部执行后 W4 约 10 h、W5 约 9 h。

## 8. 风险与回退

| 风险 | 影响 | 回退 |
| --- | --- | --- |
| 10-15 合同未冻结 | 三线程返工 | 按 WA 默认；差异在 PR 中列出；每人预留 2 h 修订 |
| LLM 不按 JSON 输出 | AC-04/07/08 | B-05 解析兜底；2 号改 Prompt；验收线 9/10 |
| O-01 无 LLM Key | AC-04 实测 | mock 演示；AC-04 标 `partial`，写明原因 |
| LLM 延迟高或限流 | 体验、超时 | 15 s 超时；health 显示 `degraded`；`fallback_reply` |
| 256m 内存不够 | OOM | 单 worker、会话上限；实测后最多提到 384m，并按 C 计划 §4.11 重算 |
| 共享令牌泄露 | 被滥用、费用 | 限速、并发上限；轮换步骤写入 C-10 |
| `audio_url` 免令牌，已知原文时可推算 | 隐私 | `audio_id` 含 voice/speed/emotion；缓存 72 h 过期；已登记为接受的风险（WA-08） |
| 重启丢失会话 | 体验 | MVP 接受，README 写明 |
| W4 超时 | 进度 | §7 削减顺序 |

## 9. 审计输出

- 文件：`audit/thread_b_audit.{md,json}`，格式沿用工作报告 v2，两份结论一致。
- JSON 字段：`report_format`、`thread: "b"`、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`contract{version,merged_pr,approvals[]}`、`llm_live{rounds,json_valid,enum_valid,provider,model}`（模型名可写，Key 不写）、`soak{requests,sessions,mem_start_mib,mem_end_mib}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。
- 证据：pytest 输出摘要；CI 链接；health 与 chat 的 curl 输出（令牌用 `***` 代替）；`docker stats` 记录。
- 敏感信息扫描：同 C 计划 §9.3，范围加上 `server/orchestrator/`。

## 10. 对公共假设的修订建议

| # | 建议 | 处理 |
| --- | --- | --- |
| 1 | 后端不返回 `reply_text`，A1-04 用 `text ?? reply_text` 兼容 | 已采纳（A 计划 A1-04） |
| 2 | `audio_id` 只由网关计算，orchestrator 透传 | 已采纳（WA-06） |
| 3 | 网关 health 免令牌、不调 provider、1 s 内返回 | 已采纳（WA-07） |
| 4 | orchestrator 增加会话、并发、限速、日志变量 | 已采纳（WA-10） |
| 5 | 根 README §13.2 旧变量名由 WA-10 取代 | 已采纳（WA-10），D2 时修订 README |
| 6 | Caddy 归 C-09，B-09 只交 orchestrator | 已采纳，并改为叠加文件（WA-10） |
| 7 | 超时预算与 `TTS_CALL_TIMEOUT_S`、`ASR_CALL_TIMEOUT_S` | 已采纳（WA-12、WA-10） |
| 8 | `ASR_UNAVAILABLE` 统一 503 | 已采纳（WA-05） |
| 9 | 新增 B-10 `/api/asr` 代理：上层计划 B-06 只覆盖 TTS，ASR 代理没有任务归属 | 已采纳（`EXECUTION_PLAN.md` v1.1） |
| 10 | `character_id` 可省略；`text` ≤ 500 字；请求体 ≤ 16 KB；同时失败时 `error` 优先 `LLM_*` | 写入合同 v1.0（B-02），D2 评审时确认 |
