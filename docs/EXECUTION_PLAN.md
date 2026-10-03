# 执行计划书（v1.1，2026-10-01）

- 另有 2 天版（2 台服务器、不设工时上限）：[`docs/implementation/2day/README.md`](implementation/2day/README.md)。按 2 天执行时，排期、拓扑、演练以 2 天版为准，本文任务 ID 和验收标准继续有效（AC-12 文字由“四台”改为“两台”）
- v1.1 变更：新增 B-10（`/api/asr` 代理，原计划没有任务归属）。三线程实施计划见 `docs/implementation/`
- 依据：`audit/reports/2026-10-01-three-thread-work-report.md`（下称“工作报告”）
- 范围：从当前状态推进到 README §18 的 16 项验收全部有证据
- 日期为建议值，需在 D1 决策会上确认；人员按 1–4 号编号

## 1. 目标与假设

目标：2026-11-13 前完成一次四服务器部署的完整演示，并提交 `audit/final_integration_audit.{md,json}`。

假设（任一不成立需要重排计划）：

1. 四人仍在岗，每人每周约可投入 10 小时。
2. D1 选“代码仓库”方案（与 README §4 和 `main` 现状一致）。若选“说明仓库”，G-02 改为“新建实现仓库并迁出 A1 包”，其余任务不变，只是换仓库执行。
3. LLM、TTS、ASR 全部走外部 API 或 Mock，四台服务器只跑轻量网关。
4. 开发期使用 Live2D 官方免费样例模型，不提交进公开仓库；正式模型由 D6 决定。

## 2. 阶段与里程碑

| 阶段 | 日期 | 内容 | 出口条件 |
| --- | --- | --- | --- |
| S0 治理 | 10-08 ~ 10-12 | D1、D9 决策；仓库整理 | 仓库结构唯一；`develop` 与线程分支建立；PR #1、#2 有结论 |
| S1 合同冻结 | 10-13 ~ 10-15 | D2、D3、D4、D5、D8 | `docs/API_CONTRACT.md` v1.0 合并，四人在 PR 中确认 |
| S2 并行最小演示 | 10-13 ~ 10-26 | 四条子线各自独立可演示 | 本线程任务验证点通过，提交线程审计 |
| S3 第一次集成 | 10-27 ~ 11-02 | 按顺序合入 `develop`，本机全链路 | IT-01 ~ IT-08 通过 |
| S4 四服务器验证 | 11-03 ~ 11-09 | 实际部署与故障演练 | 部署检查、故障切换、回滚演练通过 |
| S5 最终验收 | 11-10 ~ 11-13 | AC-01 ~ AC-16 逐项取证 | 最终审计提交，`develop` → `main` |

关键路径：D1 → D2 → B-02 / A1-04 → S3 → S4 → S5。D6（模型来源）是第二条关键路径，最晚 10-19 确定，否则 AC-03、07、08 顺延。

S1 与 S2 重叠：合同冻结前，各线程只做依赖列为“无”的任务。

## 3. S0 治理任务

| ID | 任务 | 负责 | 依赖 | 验证点 |
| --- | --- | --- | --- | --- |
| G-01 | 召开决策会：D1、D9，确认四人在岗和每周投入 | 拥有者 | 无 | 结论写入 PR，四人确认 |
| G-02 | 用 `git mv` 把 thread-a1 包迁到根目录统一结构；删 zip 前先提取 2 个 `.env.example` | 1 号 | G-01 | 不再有嵌套包；manifest 33/33；zip 已删 |
| G-03 | 加 `.gitattributes`（`* text=auto eol=lf`）和 `.editorconfig`，执行 renormalize | 1 号 | G-02 | 工作区 manifest 33/33 |
| G-04 | PR #1：按 D1 结论挑出协作文档（职责、合规、PR 指南）另行合并，或关闭。直接合并会用说明仓库版本覆盖 README | 拥有者 | G-01 | PR 已合并或关闭，并写明理由 |
| G-05 | PR #2：G-02 完成后关闭（已被取代） | 拥有者 | G-02 | PR 已关闭 |
| G-06 | 建 `develop` 和 4 个线程分支；`main`、`develop` 开启分支保护 | 拥有者 | G-02 | `git ls-remote` 可见；保护生效 |
| G-07 | 写项目级 `AGENTS.md`：目标、范围、命令、交付标准 | 拥有者 | G-01 | 已合并 |
| G-08 | GitHub Actions（windows-latest）：A1 build + test；B、C 就绪后加入 | 1 号 | G-02、A1-01 | PR 上 CI 通过 |

## 4. 线程 A：客户端与角色包

### 4.1 A1（1 号）

| ID | 任务 | 依赖 | 验证点 |
| --- | --- | --- | --- |
| A1-01 | 修构建：`index.ts:22` 去掉 `event` 参数；为 vitest 单独指定 root；`dev` 脚本先编译主进程 | 无 | `npm run build`、`npm test` 通过；全新克隆 `npm run dev` 能弹出窗口 |
| A1-02 | 实测桌宠窗口：透明、置顶、拖动、托盘、关窗后不退出 | A1-01 | 截图和操作记录写入审计 |
| A1-03 | 枚举白名单与回退：未知 emotion → `neutral`，未知 motion → `idle` | D2 | 单测覆盖合法值、未知值、空值 |
| A1-04 | 合同对齐：`text` 字段，校验 `session_id`/`character_id`，处理 `error`；过渡期读 `text ?? reply_text`；Mock 改用冻结枚举 | D2 | 单测；Mock 演示 |
| A1-05 | `session_id` 首次启动生成 UUID 并持久化；默认 `characterId=arknights_fan_001`；默认端口按合同统一 | D2 | 单测 |
| A1-06 | 连接状态与自动重连（按 D3），指数退避 | D3 | 停后端 → 显示断线 → 恢复后 30 秒内自动可用 |
| A1-07 | 接入 Live2D 渲染并读取 `model_dict.json`。选型和 Cubism Core 许可由 1、2 号先登记 | A1-01、A2-04 | 样例模型显示；缩放和位置生效 |
| A1-08 | 表情和动作调用 SDK，`emotionMap` 映射，`tapMotions` | A1-07、A2-04 | 8 个表情、7 个动作逐个触发并录屏 |
| A1-09 | 音频驱动口型（Web Audio `AnalyserNode`） | A1-07 | 有声时嘴动，静音时闭合 |
| A1-10 | 语音输入：录音 → 按 D5 送 ASR；失败切到文本输入 | D5、C-04 | 正常识别；ASR 停止时提示并聚焦输入框 |
| A1-11 | Windows 打包 `npm run package` | A1-01 | 干净机器可安装、可启动 |

### 4.2 A2（2 号）

| ID | 任务 | 依赖 | 验证点 |
| --- | --- | --- | --- |
| A2-01 | 枚举提案：确认 8 个情绪、7 个动作，作为 D2 输入 | 无 | 1、3 号在 PR 中确认 |
| A2-02 | `characters/arknights_fan_001.yaml` 和字段说明 | A2-01 | B-04 loader 解析通过 |
| A2-03 | 5 个 Prompt 文件；`emotion_rules.md` 要求 LLM 按 JSON 输出且只用冻结枚举 | A2-01 | 真实 LLM 10 轮对话，B 侧记录枚举合法率 |
| A2-04 | 正式 `model_dict.json`，与开发模型的表情、动作名对照 | A2-01、D6 | A1-08 通过 |
| A2-05 | D6：确定开发模型和正式模型来源，填写 `ASSET_SOURCE_TABLE.md` | 无 | 每项都有作者、链接、许可、用途、状态 |
| A2-06 | `docs/VOICE_POLICY.md`；`LICENSE_NOTICE.md` 补上游 MIT 和 Live2D 样例许可 | D9 | 已合并 |
| A2-07 | 知识文件初版（不复制官方剧情原文） | A2-02 | 抽查 |

## 5. 线程 B：编排与 LLM（3 号）

| ID | 任务 | 依赖 | 验证点 |
| --- | --- | --- | --- |
| B-01 | D4 调研：Open-LLM-VTuber 后端（`/client-ws`）能否在 1 GiB 下运行并满足 HTTP 合同；输出建议 | 无 | 一页结论，含内存实测或明确标“未实测” |
| B-02 | 合同 v1.0：补 `/api/tts`、`/api/asr`、错误对象 `{code, message}`、鉴权头、超时、枚举；加 JSON Schema | A2-01、B-01、C-01 | 四人确认；schema 校验样例通过 |
| B-03 | orchestrator 骨架：`/api/health`、`/api/chat`（mock LLM）、`/api/characters` | B-02 | pytest：schema 合规、未知枚举被修正为默认值 |
| B-04 | 角色 loader：读 YAML，拼接 Prompt | A2-02 | 单测：缺文件、缺字段时报错清楚 |
| B-05 | LLM 适配：OpenAI-compatible，解析输出 JSON，解析失败时用兜底回复 | B-03 | mock 模式；有 Key 时实测；无 Key 时 Key 相关测试跳过 |
| B-06 | 调用 TTS：VM-2 失败切 VM-4，全部失败返回 `audio_url=null` | C-02、C-06 | 停 TTS 后仍返回文字和表情 |
| B-07 | 会话管理：按 `session_id` 保存最近 N 轮，内存上限，过期清理 | B-03 | 单测；长时间运行内存平稳 |
| B-08 | 鉴权与限流（D8）：共享令牌、CORS 白名单、每会话限速 | B-03、D8 | 无令牌 401；超限 429 |
| B-09 | `deploy/vm1-gateway`：compose、内存上限、`.env.example` | B-03、C-01 | VM-1 上 `/api/health` 正常 |
| B-10 | `/api/asr` 代理：鉴权、大小限制、转发 VM-3，失败返回 503 `ASR_UNAVAILABLE` | B-03、C-04 | 样例 WAV 经 VM-1 返回文字；停 VM-3 返回 503 |

合同冻结前 B-03 不开始写业务代码（风险 R2）。

## 6. 线程 C：语音与部署（4 号）

| ID | 任务 | 依赖 | 验证点 |
| --- | --- | --- | --- |
| C-01 | D7：登录 4 台 VM，记录 CPU、内存、磁盘、系统、出口网络、开放端口（脱敏后存档） | 无 | `audit/` 下有记录，不含地址和凭据 |
| C-02 | `tts_gateway`：Edge TTS 等合法 provider，按文本 hash 缓存，TTL 清理 | B-02 | 单测；缓存命中第二次请求明显更快 |
| C-03 | VM-2 部署 TTS，compose 设内存上限 | C-01、C-02 | 运行 1 小时无 OOM，`docker stats` 留证 |
| C-04 | `asr_gateway`（按 D5）：云 ASR 代理 | D5、B-02 | 样例 wav 能识别；超时返回标准错误 |
| C-05 | VM-3 部署 ASR | C-01、C-04 | `/api/health` 正常 |
| C-06 | VM-4：备用 TTS、配置与日志备份 | C-02 | 停 VM-2 后由 VM-4 返回音频 |
| C-07 | `scripts/healthcheck.sh`：逐台逐服务输出状态和退出码 | C-03、C-05、B-09 | 停任一服务，脚本能指出是哪台 |
| C-08 | `install_vm.sh`、`backup_config.sh`、`update_all.sh`，含回滚步骤 | C-01 | 在一台 VM 上实际执行回滚 |
| C-09 | HTTPS 反向代理与证书（VM-1）。远程麦克风需要安全上下文 | B-09 | 客户端通过 https 连接成功 |
| C-10 | `docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` 正式版 | C-07 | 非作者按文档从零部署一台成功 |

## 7. S3 集成

合并顺序沿用 README §16：`thread-a-character` → `thread-c-voice-ops` → `thread-b-orchestrator` → `thread-a-desktop` → `develop`。每次合并后在 `develop` 上跑完整 CI。

| ID | 场景 | 通过标准 |
| --- | --- | --- |
| IT-01 | 本机后端 + 客户端，文本对话 | 字幕、表情、动作正确 |
| IT-02 | 加 TTS | 播放音频，口型跟随 |
| IT-03 | 加 ASR | 语音提问得到回复 |
| IT-04 | 返回未知 emotion / motion | 回退 `neutral` / `idle` |
| IT-05 | 停 TTS | 只显示字幕，不报错 |
| IT-06 | 停 ASR | 提示并切换到文本输入 |
| IT-07 | 停后端 30 秒后恢复 | 自动重连 |
| IT-08 | LLM 超时或 Key 无效 | 兜底回复 |

## 8. S4 四服务器验证

1. 按 C-10 文档从零部署 VM-1 至 VM-4。
2. 客户端连接 VM-1（https），重跑 IT-01 至 IT-08。
3. 故障演练：逐台停机，用 healthcheck 定位；停 VM-2 验证 VM-4 接管。
4. 回滚演练：在一台 VM 上回退到上一版本。
5. 资源记录：每台峰值内存，作为风险 R3 的结论。

## 9. 决策时间表

| ID | 截止 | 未按时决定时的默认方案 |
| --- | --- | --- |
| D1 | 10-08 | 代码仓库方案 |
| D9 | 10-08 | 代码部分用 MIT（与上游一致），素材另行授权 |
| D2 | 10-15 | 采用 `API_CONTRACT.md` 现有字段和枚举 |
| D3 | 10-15 | HTTP + `/api/health` 轮询重连（改动最小，符合现有客户端） |
| D4 | 10-15 | 自建轻量 orchestrator，上游只作参考 |
| D5 | 10-15 | VM-3 云 ASR 代理（README 方案 B） |
| D8 | 10-15 | 共享令牌 + HTTPS + 限流 |
| D6 | 10-19 | 开发和演示用官方免费样例，不公开发布 |
| D7 | 10-19 | 无默认；未核实则 S4 顺延 |

默认方案是为了避免长期阻塞，主导人可以在截止前提出替代方案。

## 10. 汇报与审计

- 每周一同步：每线程更新本周状态，格式沿用工作报告 v2（MD + JSON）。
- 线程完成时提交 `audit/thread_<a1|a2|b|c>_audit.{md,json}`，测试结果附原始命令和输出。
- 状态按验收项推导：没有证据不能写 pass；没跑的测试写 `not_run` 并说明原因。
- 最终在 S5 提交 `audit/final_integration_audit.{md,json}`，逐项给出 AC-01 至 AC-16 的证据。

## 11. 变更控制

- 改公共接口：先改 `docs/API_CONTRACT.md` 并经受影响人员在 PR 中确认，再改代码（README §24）。
- 所有改动通过 PR 进入 `develop`，至少 1 人审阅；不直接推 `main`。
- 不提交 `.env`、凭据、服务器地址、官方素材或未授权音色。
- 计划变更时更新本文件版本号，并在周报中说明原因。

## 12. 下一步（本周）

1. 拥有者：10-08 前召开 G-01 决策会，决定 D1、D9。
2. 1 号：A1-01 修构建（不依赖任何决策，约 1 小时）。
3. 2 号：A2-01 枚举提案、A2-05 开始登记模型来源。
4. 3 号：B-01 上游调研。
5. 4 号：C-01 登录核实 4 台服务器。
