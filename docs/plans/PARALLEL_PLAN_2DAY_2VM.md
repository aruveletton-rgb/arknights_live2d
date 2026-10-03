# 三线程并行计划书 · 2 天版（2 台服务器，不设工时上限）

- 版本：2day-v1 合订本（2026-10-03 合并）。正文来自 2 天版 4 个源文件，附录收录正文引用的 v1 原文节选，使本文可以独立阅读。内容未改写，只做了两处机械处理：标题降一级、文件间链接改为“本文第 N 部分 / 附录 X”
- 源文件：`docs/implementation/2day/{README,THREAD_A_2DAY_PLAN,THREAD_B_2DAY_PLAN,THREAD_C_2DAY_PLAN}.md`；附录来自 `docs/EXECUTION_PLAN.md`、`docs/implementation/README.md`、`docs/implementation/THREAD_{A,B,C}_IMPLEMENTATION_PLAN.md`。以后修订先改源文件，再同步本文
- 另一份：[v1 合订本（6 周，4 台服务器）](PARALLEL_PLAN_V1_6WEEK_4VM.md)
- 优先级：正文与附录冲突时以正文为准。附录中的四台拓扑（VM-3、VM-4）、节点名 `vm2`/`vm4`、10 月日期、工时与削减顺序、v1 演练编号均已被正文取代，只有任务实施细节（代码、命令、测试要点、审计字段）继续有效
- 状态：草案。时间为建议值；“AI 编码代理能在 2 天内完成主要代码”这一假设未经验证，第 1 天 14:00 的 CP2 首次校验

## 第 0 部分　摘要

### 0.1 目标与前提

- 目标：连续 2 个工作日内，在 2 台服务器上完成一次完整演示，AC-01 ~ AC-16 逐项有证据（或写明未达成原因），提交 `audit/final_integration_audit.{md,json}`。
- 前提：四人两天全程在岗；不设工时上限，排期只受依赖和检查点约束；开工前清单（第 1 部分第 2 节）的“必需”项在第 1 天 08:30 前就绪；决策 D1 ~ D9 在启动会一次拍板。
- AC-12 已改为“两台服务器可通过 Docker Compose 部署”（仓库根 `README.md` 第 18 节第 12 项已同步修改）。

### 0.2 拓扑（2 台）

| 主机 | 服务 | 端口 / 绑定 |
| --- | --- | --- |
| VM-1 | caddy（HTTPS 入口） | 80、443，`0.0.0.0` |
| VM-1 | orchestrator | 12393，`127.0.0.1` |
| VM-1 | tts_gateway 备（`fallback`） | 8082，VM-1 私网地址 |
| VM-2 | tts_gateway 主（`primary`） | 8082，VM-2 私网地址 |
| VM-2 | asr_gateway | 8083，VM-2 私网地址 |
| VM-2 | 健康检查 cron、配置备份 | — |

VM-1 启动：`docker compose -f compose.yaml -f compose.caddy.yaml -f compose.tts.yaml up -d`。更新顺序 VM-2 → VM-1。内存上限合计 VM-1 608 MiB、VM-2 512 MiB（未实测，第 2 天 11:00 ~ 12:00 实测）。

### 0.3 检查点

| 检查点 | 时间 | 要点 |
| --- | --- | --- |
| CP1 | 第 1 天 10:30 | G-02 合并；合同 v1.0 冻结（H-04） |
| CP2 | 第 1 天 14:00 | H-05、H-07、H-08、H-10 已交付；Live2D 兼容性试验结论；节奏校验 |
| CP3 | 第 1 天 18:00 | 四个线程分支 CI 通过；Mock 演示（H-12） |
| CP4 | 第 1 天 22:00 | 合入 `develop`；本机 IT-01 ~ IT-08 有结果 |
| CP5 | 第 2 天 12:00 | 客户端经 VM-1 https 完成对话、TTS、语音输入 |
| CP6 | 第 2 天 16:00 | 演练 D-1 ~ D-9 有结果；资源测量完成 |
| CP7 | 第 2 天 18:00 | 线程审计 + 最终审计提交；`develop` → `main` PR |

第 2 天 18:00 ~ 22:00 为缓冲时段，只修 CP5 ~ CP7 的失败项。检查点未通过时延长当前块或按依赖降级，降级项不得记 `pass`。

### 0.4 线程分工

| 线程 | 负责人 | 第 1 天 | 第 2 天 | 提供的交接物 |
| --- | --- | --- | --- | --- |
| A | 1 号（A1） | G-02/G-03 → A1-01、G-08、A1-03 ~ A1-05 → A1-06 ~ A1-08 → A1-09、A1-10、本机集成 | A1-11 打包；改连 VM-1 https；演练配合与补证 | H-06（与 2 号）、H-14 |
| A | 2 号（A2） | A2-01 → A2-02、A2-03、H-07 → A2-04、A2-06、A2-07 → 集成取证 | 干净机器安装验证；C-10 非作者验证；Prompt 10 轮实测；汇总最终审计 | H-01、H-05、H-06、H-07 |
| B | 3 号 | B-01、B-02（合同）→ B-03 骨架、B-08 → B-04 ~ B-08、B-10 → 合入 `develop`、本机 IT | B-09 部署 VM-1；远程 IT；与 4 号演练 | H-03、H-04、H-10、H-13 |
| C | 4 号 | H-02、C-01 → C-08a、C-02 → C-04、C-07 → VM-2 部署、C-09 文件、C-10 初稿 | VM-1 caddy + tts_fallback；资源测量；C-08b/c；演练；关闭 12393 临时放行 | H-02、H-08、H-09、H-11 |

先保关键路径：合同 → orchestrator → 客户端文本对话 → 两台部署。节奏不足时 A1-09、A1-11、C-08c、B-07 长跑可后移到缓冲时段（第 1 部分 R-02）。

### 0.5 未验证与已知局限

- 未验证：AI 编码代理的产出速度（CP2）；内存预算（演练 D-9）；两台是否同一 VNet、NSG 默认规则（C-01）；Electron 打包后的 Origin；Live2D 库兼容性（第 1 天 13:00）；Cubism Core 分发许可；HTTP 下麦克风是否可用（CP5）。
- 局限：VM-2 整机丢失时其自身配置备份一并丢失，需从 git 和密码管理器恢复；2 号的非作者部署验证不在空白 VM 上进行，AC-16 部署部分最高记 `partial`。
- 旧部署目录 `deploy/vm2-tts/`、`vm3-asr/`、`vm4-fallback/` 只标注停用，不删除。

### 0.6 阅读指引

| 文中写法 | 在本文中的位置 |
| --- | --- |
| “总览”“2 天总览” | 第 1 部分 |
| 线程 A、B、C 的 2 天计划 | 第 2、3、4 部分 |
| “v1 计划”、v1 `EXECUTION_PLAN.md` | 附录 A（节选第 3、7、9 节） |
| “v1 总览” | 附录 B（节选第 3 节 WA） |
| “v1 A 计划”“v1 B 计划”“v1 C 计划” | 附录 C、D、E（节选第 3 ~ 6、9 节） |
| 时间中的 D1、D2 | 第 1 天、第 2 天 |
| “决策 Dn” | 启动会决策（第 1 部分第 11 节） |
| “README §N” | 仓库根目录 `README.md` |

---

## 第 1 部分：三线程并行计划总览（2 天版，2 台服务器）

- 版本：2day-v1（基于 2026-10-01 状态编制）
- 取代范围：v1 的排期（W0 ~ W6）、四服务器拓扑、每周 10 h 的工时假设与削减清单
- 继续沿用：v1 的任务 ID、公共工作假设 WA-02 ~ WA-05、WA-09、WA-11、WA-12，以及各任务的实施细节（代码片段、测试要点）。本目录只写差异
- v1 文件：`docs/EXECUTION_PLAN.md`（v1.1）、`docs/implementation/README.md`（下称“v1 总览”）、`docs/implementation/THREAD_{A,B,C}_IMPLEMENTATION_PLAN.md`（下称“v1 A/B/C 计划”）
- 现状依据：`audit/reports/2026-10-01-three-thread-work-report.md`
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（第 11 节）

| 线程 | 负责人 | 2 天计划 |
| --- | --- | --- |
| A：客户端 + Live2D + 角色包 | 1 号（A1）、2 号（A2） | THREAD_A_2DAY_PLAN.md（本文第 2 部分） |
| B：编排 + API + LLM | 3 号 | THREAD_B_2DAY_PLAN.md（本文第 3 部分） |
| C：TTS/ASR + 服务器部署 | 4 号 | THREAD_C_2DAY_PLAN.md（本文第 4 部分） |

### 1. 目标与假设

目标：连续 2 个工作日内，在 2 台服务器上完成一次完整演示，AC-01 ~ AC-16 逐项有证据（或写明未达成原因），并提交 `audit/final_integration_audit.{md,json}`。

假设（任一不成立，按第 9 节处理）：

1. 四人两天全程在岗。不设工时上限：排期只受依赖顺序和检查点约束，不按工时削减范围。
2. 各线程用 AI 编码代理（Codex / Claude Code）生成主要代码，人负责决策、审阅和实测。v1 的工时估算（合计 226 h）按人工编码估算，不能直接换算成 2 天；本计划不再给出工时表。**这一假设未经验证**，第 1 天 14:00 的检查点 CP2 是第一次校验它的机会。
3. 第 1 天开始前，开工前清单（第 2 节）中标为“必需”的项已就绪。
4. 决策 D1 ~ D9 在启动会上一次拍板，未提出替代方案的一律取 v1 计划 §9 的默认方案。
5. LLM、TTS、ASR 全部走外部 API 或 Mock；两台服务器只跑轻量服务。
6. 演示用 Live2D 官方免费样例模型，只放本机，不提交仓库（决策 D6 默认）。正式模型不在 2 天范围内。
7. 服务器规格沿用 2 vCPU / 1 GiB（未核实，第 1 天 C-01 核实）。

### 2. 开工前清单（第 1 天 08:30 前）

| ID | 内容 | 负责 | 级别 | 未就绪时 |
| --- | --- | --- | --- | --- |
| P-01 | 两台 VM 的登录权限，NSG 查看与修改权限（原 O-03） | 拥有者 → 4 号 | 必需 | 服务器任务全部顺延；第 2 天 09:00 仍未就绪，按第 9 节 R-01 处理 |
| P-02 | 两台 VM 在同一 VNet，可互通私网地址 | 拥有者 | 必需 | 不同 VNet 时改走公网 + NSG 白名单 + 内部令牌，4 号在 C-01 中记录 |
| P-03 | VM-1 域名，DNS 指向 VM-1 公网地址（原 O-02） | 拥有者 | 建议 | 用 sslip.io 类域名（需拥有者同意）；再不行用 HTTP + 团队 IP 白名单，AC-02 记 `partial` |
| P-04 | LLM Key（原 O-01） | 拥有者 | 建议 | `LLM_PROVIDER=mock`，AC-04 记 `partial` |
| P-05 | 云 ASR Key（原 O-01） | 拥有者 | 建议 | `ASR_PROVIDER=mock`，AC-05 记 `partial` |
| P-06 | 团队成员出口 IP 列表（NSG 白名单用） | 全员 → 4 号 | 必需 | 第 1 天联调只在本机进行 |
| P-07 | 开发机：Node 22、Python 3.11、Docker Desktop、Git；1 号用 Windows | 全员 | 必需 | 当人自行补装，启动会上报告 |
| P-08 | 一台干净的 Windows 机器或虚拟机（打包验证用） | 拥有者或 2 号 | 建议 | 用 Windows Sandbox；都没有则 AC-16 安装部分记 `not_run` |
| P-09 | Live2D 官方免费样例模型（选定 1 个）已下载到 1、2 号本机，许可条款已存档 | 2 号 | 必需 | 第 1 天 1.1 块内补齐；AC-03/07/08 风险上升 |
| P-10 | 密码管理器或其他安全渠道，用于传递 `CLIENT_TOKEN`、`INTERNAL_TOKEN`、各 Key | 拥有者 | 必需 | 不得用聊天、提交或审计文件传递 |

### 3. 两台服务器拓扑（取代 WA-01、WA-08 中的四服务器部分）

#### 3.1 服务与端口

| 服务 | 主机 | 容器端口 | 宿主机绑定 | 部署目录 | 文件负责人 |
| --- | --- | --- | --- | --- | --- |
| caddy | VM-1 | 80、443 | `0.0.0.0` | `deploy/vm1-gateway/compose.caddy.yaml`、`Caddyfile` | 4 号 |
| orchestrator | VM-1 | 12393 | `127.0.0.1`（正式）；联调期可临时绑私网地址 | `deploy/vm1-gateway/compose.yaml`、`.env.example` | 3 号 |
| tts_gateway（备，`fallback`） | VM-1 | 8082 | VM-1 私网地址 | `deploy/vm1-gateway/compose.tts.yaml` | 4 号 |
| tts_gateway（主，`primary`） | VM-2 | 8082 | VM-2 私网地址 | `deploy/vm2-voice/compose.yaml` | 4 号 |
| asr_gateway | VM-2 | 8083 | VM-2 私网地址 | 同上 | 4 号 |
| 健康检查 cron、配置备份 | VM-2 | — | — | `deploy/vm2-voice/cron.example` | 4 号 |
| 客户端 | 本地 | 开发 5173 | — | `upstream/Open-LLM-VTuber/client/` | 1 号 |

- VM-1 三个 compose 文件属于同一项目，共用默认网络：`docker compose -f compose.yaml -f compose.caddy.yaml -f compose.tts.yaml up -d`。orchestrator 通过 `http://tts_fallback:8082` 访问备用 TTS；备用 TTS 另绑 VM-1 私网地址，只为让 VM-2 上的健康检查能访问。
- 备用 TTS 放在 VM-1 而不是 VM-2：VM-2 整机故障时 TTS 仍可用。代价是 VM-1 故障时整体不可用（VM-1 本来就是唯一入口，四服务器方案也一样）。
- 旧部署占位目录 `deploy/vm2-tts/`、`deploy/vm3-asr/`、`deploy/vm4-fallback/`（G-02 迁移后位于根目录）不删除，只在各自 README 首行注明“2 台方案下停用”；是否删除由拥有者决定。

#### 3.2 内存预算（未实测，第 2 天 12:00 实测）

| VM | 容器（`mem_limit`） | 上限合计 | 预计常驻（未实测） | 系统 + Docker（未实测） | 判定线 |
| --- | --- | --- | --- | --- | --- |
| VM-1 | orchestrator 256m、caddy 96m、tts_fallback 256m | 608 MiB | 约 190 MiB | 约 300 MiB | 1 小时内 `OOMKilled=false`，`free -m` 可用内存 ≥ 150 MiB |
| VM-2 | tts_gateway 256m、asr_gateway 256m | 512 MiB | 约 150 MiB | 约 300 MiB | 同上 |

两台都配 1 GiB swap（C-08a）。VM-1 上限合计加系统已接近 1 GiB，实测超过判定线时先把 tts_fallback 降到 192m，再考虑把备用 TTS 挪到 VM-2（同时失去整机容灾，需在审计中写明）。

#### 3.3 防火墙矩阵（取代 v1 C 计划 §4.12）

| VM | 端口 | 允许来源 | 控制层 |
| --- | --- | --- | --- |
| VM-1 | 22 | `<admin-src>` | NSG + ufw |
| VM-1 | 80、443 | 任意 | NSG + ufw |
| VM-1 | 12393 | 仅第 2 天上午联调：团队 IP；证书签发后关闭，最晚 CP7 | NSG；正式环境绑 `127.0.0.1` |
| VM-1 | 8082 | VM-2（健康检查） | NSG；绑私网地址 |
| VM-2 | 8082、8083 | VM-1 | NSG；绑私网地址 |
| VM-2 | 22 | `<admin-src>` | NSG + ufw |
| VM-1 | 22 | VM-2（受限密钥拉备份，需拥有者授权） | NSG + ufw + `authorized_keys` 的 `restrict,command=` |
| 两台 | 出站 | 任意（Edge TTS、云 ASR、LLM、PyPI、Docker Hub） | — |

Docker 发布的端口不经过 ufw 规则（WA-08），8082/8083 只能靠绑定地址和 NSG 控制。Azure NSG 默认规则通常放行同一 VNet 内流量（需在 C-01 核实）；要做到只允许对端访问，需加显式拒绝规则，内部令牌作为第二层。

### 4. 公共工作假设的差异

未列出的 WA 条目沿用 v1 总览第 3 节。合同在第 1 天 CP1 冻结（H-04），冻结后以 `docs/API_CONTRACT.md` v1.0 为准。

| 条目 | v1 | 2 天版 |
| --- | --- | --- |
| WA-01 | 4 台 VM | 改为第 3.1 节的 2 台拓扑 |
| WA-06 音频节点 | `audio_url` 中 `node` 取 `vm2` 或 `vm4` | `node` 取 `primary` 或 `fallback`，与拓扑解耦：`TTS_PRIMARY_URL` 对应 `primary`，`TTS_FALLBACK_URL` 对应 `fallback`。对外路径 `/api/audio/{node}/{audio_id}.mp3` 不变 |
| WA-07 | 网关只有 tts / asr | 不变。orchestrator 的 `tts` 字段：两个 TTS 节点都 ok → `ok`；只剩一个 → `degraded`；都不通 → `down` |
| WA-08 来源限制 | VM-2/3/4 只允许 VM-1、VM-4 | VM-2 只允许 VM-1；VM-1 的 8082 只允许 VM-2（健康检查）。见第 3.3 节 |
| WA-10 取值 | — | 变量名不变。VM-1 上 `TTS_PRIMARY_URL=http://<vm2-private>:8082`、`TTS_FALLBACK_URL=http://tts_fallback:8082`、`ASR_GATEWAY_URL=http://<vm2-private>:8083` |
| WA-10 部署变量 | `BIND_ADDR`、`IMAGE_TAG`、`VM1_DOMAIN` | 增加 `PRIVATE_BIND_ADDR`：VM-1 的 `compose.tts.yaml` 用它绑私网地址，orchestrator 仍用 `BIND_ADDR`（默认 `127.0.0.1`）。VM-2 只用 `BIND_ADDR`（取私网地址） |
| WA-11 CI | 3 个 workflow | 不变。第 1 天 CP3 前各自建好，PR 合并前必须通过 |
| WA-12 超时 | — | 不变。`/api/chat` 最坏 15 + 6 + 6 = 27 s < 30 s |

### 5. 两天时间表

时间为建议值，以检查点（第 6 节）为准：检查点未通过时，先按第 6 节的处理方式调整，再继续后面的块。每个块的细节见各线程计划第 4 节。

#### 5.1 第 1 天：合同冻结、并行实现、本机集成

| 时间 | 1 号（A1） | 2 号（A2） | 3 号（B） | 4 号（C） | 拥有者 |
| --- | --- | --- | --- | --- | --- |
| 08:30 ~ 09:00 | 启动会：确认开工前清单；决策 D1 ~ D9 拍板；分发令牌（P-10） | 同左 | 同左 | 同左 | 主持；记录结论（G-01、G-07） |
| 09:00 ~ 10:30 | G-02 嵌套目录迁移 + G-03（单个 PR） | A2-01 枚举提案（H-01，09:30）；A2-05 登记样例模型 | B-01 结论定稿（H-03）；B-02 合同 v1.0 PR | H-02 内部接口提案（09:30）；C-01 登录核实两台 VM | G-04、G-05 处理 PR #1、#2；G-06 建分支（G-02 合并后） |
| 10:30 | **CP1**：G-02 合并；合同 v1.0 合并（H-04） | | | | 审批 |
| 10:30 ~ 14:00 | A1-01 修构建；G-08 CI；A1-03、A1-04、A1-05；A1-07 兼容性试验（13:00 起） | A2-02 角色 YAML；A2-03 Prompt；H-07 `voices.yaml`（12:00） | B-03 骨架 + mock LLM（H-10，13:00）；B-08 鉴权部分 | C-08a 两台装 Docker + swap；C-02 tts_gateway mock（H-08，13:00） | NSG 规则审批（第 3.3 节） |
| 14:00 | **CP2**：H-05、H-07、H-08、H-10 已交付；A1-07 兼容性试验结论；节奏校验 | | | | |
| 14:00 ~ 18:00 | A1-06 重连；A1-07 Live2D 渲染；A1-08 表情动作 | A2-04 `model_dict.json`（与 1 号）；A2-06 合规文档；A2-07 知识文件 | B-04、B-05、B-06、B-07、B-08 余下部分、B-10 | C-04 asr_gateway（H-11，16:00）；C-02 edge_tts provider；C-07 healthcheck；VM 部署文件 | — |
| 18:00 | **CP3**：各线程分支 CI 通过；各自的 Mock 演示可运行（H-12） | | | | |
| 18:00 ~ 22:00 | A1-09 口型；A1-10 语音输入；本机集成 | 本机集成取证；Prompt 实测（有 LLM Key 时） | 按顺序合入 `develop`；本机集成 IT-01 ~ IT-08 | VM-2 部署 voice（mock provider 可先行）；C-09 Caddy 文件；C-10 文档初稿 | 审阅合并 PR |
| 22:00 | **CP4**：`develop` 包含四个线程分支；本机 IT-01 ~ IT-08 结果已记录 | | | | |

#### 5.2 第 2 天：两台部署、演练、验收

| 时间 | 1 号（A1） | 2 号（A2） | 3 号（B） | 4 号（C） | 拥有者 |
| --- | --- | --- | --- | --- | --- |
| 08:30 ~ 09:00 | 站会：CP4 遗留项分配；确认当天演练窗口 | 同左 | 同左 | 同左 | 主持 |
| 09:00 ~ 12:00 | A1-11 打包；客户端改连 VM-1 https | 干净 Windows 准备；C-10 文档非作者预读 | B-09 VM-1 部署 orchestrator；远程 IT-01 ~ IT-08 | VM-1 部署 caddy + tts_fallback（C-06、C-09）；C-08b/c；11:00 起两台 1 小时资源测量 | DNS / 证书确认 |
| 12:00 | **CP5**：客户端经 https 完成对话、TTS、ASR（AC-02、04、05、06） | | | | |
| 13:00 ~ 16:00 | 演练配合（客户端截图）；M-01 ~ M-08 补证 | 干净机器安装验证（AC-16 安装部分）；C-10 非作者部署验证；Prompt 10 轮实测 | 演练 D-1 ~ D-8（与 4 号） | C-08b/c 两台部署（13:30 前）；演练 D-1 ~ D-8；C-10 文档定稿 | 演练在场（D-5、D-6 重启需在场） |
| 16:00 | **CP6**：演练全部有结果；资源测量结束 | | | | |
| 16:00 ~ 18:00 | `audit/thread_a1_audit.*` | `audit/thread_a2_audit.*`；汇总最终审计 | `audit/thread_b_audit.*` | `audit/thread_c_audit.*`；关闭 12393 临时放行 | `develop` → `main` PR 审批 |
| 18:00 | **CP7**：`audit/final_integration_audit.{md,json}` 提交；演示 | | | | 验收 |
| 18:00 ~ 22:00 | 缓冲：只用于修复 CP5 ~ CP7 的失败项并重新取证，不加新功能 | | | | |

### 6. 检查点

不设工时上限，所以检查点未通过时的处理方式是“延长当前块、调整后续顺序”或“按依赖降级”，不是按工时削减。任何降级都要在对应审计中写明，相关验收项不得记 `pass`。

| 检查点 | 时间 | 通过条件 | 未通过时 |
| --- | --- | --- | --- |
| CP1 | 第 1 天 10:30 | G-02 已合并，根目录结构唯一；`docs/API_CONTRACT.md` v1.0 合并，四人在 PR 中确认；schemas + fixtures 校验通过 | 合同未冻结：按 WA 默认继续开发，最晚 12:00 冻结；G-02 未合并：其他人只在新目录（`server/`、`deploy/`、`character_pack/`）工作，不碰嵌套目录 |
| CP2 | 第 1 天 14:00 | H-05、H-07、H-08、H-10 已交付；A1-07 兼容性试验有结论；各线程对照本表判断进度 | 某交接物未到：接收方继续用 Mock；Live2D 库不兼容：切换社区分支，再不行 AC-03/07/08 按第 9 节 R-04 处理；整体明显落后：第 1 天晚间块延长到 24:00，第 2 天上午的部署顺延 |
| CP3 | 第 1 天 18:00 | 四个线程分支 CI 通过；各自 Mock 演示可运行（H-12） | CI 未通过的分支先修 CI 再合并，不跳过检查 |
| CP4 | 第 1 天 22:00 | 四个线程分支已按顺序合入 `develop`；本机 IT-01 ~ IT-08 都有结果（pass / fail + 原因） | 第 2 天 09:00 ~ 10:30 先修本机失败项；部署按“可用部分先上”进行 |
| CP5 | 第 2 天 12:00 | 客户端经 VM-1 https 完成文本对话、TTS 播放、语音输入 | 无域名：HTTP + 团队 IP 白名单，AC-02 记 `partial`；某服务不通：先做其余演练，失败项进缓冲时段 |
| CP6 | 第 2 天 16:00 | D-1 ~ D-9 都有结果和证据；两台 1 小时资源测量完成 | 未完成的演练在缓冲时段补做；仍未完成写 `not_run` 并说明原因 |
| CP7 | 第 2 天 18:00 | 四份线程审计 + 最终审计提交，MD 与 JSON 结论一致；`develop` → `main` PR 已建 | 缓冲时段补齐；22:00 仍未补齐的项按实际状态记录，不改写为 `pass` |

### 7. 跨线程交接物（取代 v1 总览第 4 节的截止日期）

| ID | 内容 | 提供 | 接收 | 截止 |
| --- | --- | --- | --- | --- |
| H-01 | emotion/motion 枚举提案（A2-01） | 2 号 | 3 号、1 号 | 第 1 天 09:30 |
| H-02 | TTS/ASR 内部接口提案（v1 C 计划 §6.1，`node` 按第 4 节改为 `primary`/`fallback`） | 4 号 | 3 号 | 第 1 天 09:30 |
| H-03 | 上游调研结论（B-01） | 3 号 | 全员 | 第 1 天 10:00 |
| H-04 | 合同 v1.0 + JSON Schema + fixtures（B-02） | 3 号 | 1、2、4 号 | 第 1 天 10:30（CP1） |
| H-05 | 角色 YAML + 5 个 Prompt（A2-02、A2-03） | 2 号 | 3 号 | 第 1 天 13:00 |
| H-06 | 样例模型说明 + `model_dict.json` 开发版（A2-04） | 2 号、1 号 | 1 号 | 第 1 天 16:00 |
| H-07 | `voices.yaml` | 2 号 | 4 号 | 第 1 天 12:00 |
| H-08 | tts_gateway 本机可运行（mock provider） | 4 号 | 3 号 | 第 1 天 13:00 |
| H-09 | C-01 服务器核实记录；两台已装 Docker | 4 号 | 3 号 | 第 1 天 10:30；14:00 |
| H-10 | orchestrator 本机 mock 模式可运行 | 3 号 | 1 号 | 第 1 天 13:00 |
| H-11 | asr_gateway 本机可运行（mock provider） | 4 号 | 3 号、1 号 | 第 1 天 16:00 |
| H-12 | 各线程分支 CI 通过 + Mock 演示 | 全员 | 拥有者 | 第 1 天 18:00（CP3） |
| H-13 | `deploy/vm1-gateway/compose.yaml` + `.env.example`（B-09） | 3 号 | 4 号 | 第 1 天 20:00 |
| H-14 | 客户端录制的 WAV 样例（16 kHz，单声道，16 bit） | 1 号 | 4 号 | 第 1 天 20:00 |

交接物晚于截止时间 1 小时以上，接收方在团队频道说明并继续用 Mock；提供方在下一个检查点报告新的预计时间。

### 8. 集成、部署与演练

#### 8.1 分支与合并

- 分支：`main`、`develop`，线程分支 `thread-a-desktop`（1 号）、`thread-a-character`（2 号）、`thread-b-orchestrator`（3 号）、`thread-c-voice-ops`（4 号）（G-06）。
- 合并顺序（README §16，不变）：`thread-a-character` → `thread-c-voice-ops` → `thread-b-orchestrator` → `thread-a-desktop` → `develop`。第 1 天 18:00 ~ 22:00 合并，每次合并后在 `develop` 上跑完整 CI。
- 第 1 天 CP4 之后，修复走短分支（`fix/<描述>`）PR 到 `develop`，至少 1 人审阅。
- `develop` → `main` 在 CP7 建 PR，由拥有者审批合并；不直接推 `main`，不强推。

#### 8.2 本机集成（第 1 天晚间）

沿用 v1 C 计划 §5.3 的本机多进程方式：orchestrator 12393、tts 8082（primary）、tts 8084（fallback）、asr 8083。场景 IT-01 ~ IT-08 与 v1 `EXECUTION_PLAN.md` 第 7 节相同；B 侧触发方法见 v1 B 计划 §5.3。

#### 8.3 两台部署（第 2 天上午）

1. 4 号：VM-2 `deploy/vm2-voice/` 启动 tts_gateway + asr_gateway；provider 有 Key 用真实值，没有用 mock（Edge TTS 不需要 Key）。
2. 3 号：VM-1 orchestrator 先绑私网地址，从 VM-1 本机 curl 验证 chat；4 号叠加 `compose.tts.yaml`（tts_fallback）和 `compose.caddy.yaml`。
3. 证书签发后，orchestrator 改绑 `127.0.0.1:12393`，NSG 关闭 12393 临时放行（最晚 CP7）。
4. 客户端改连 `https://<vm1-domain>`，重跑 IT-01 ~ IT-08（远程版）。

#### 8.4 演练（第 2 天下午，取代 v1 C 计划 §5.4）

| ID | 操作 | 期望 | 证据 |
| --- | --- | --- | --- |
| D-1 | 停 VM-2 的 tts_gateway | `audio_url` 节点为 `fallback`；healthcheck 报 vm2/tts_gateway down，退出码 2；orchestrator health `tts=degraded` | 命令输出 |
| D-2 | 再停 VM-1 的 tts_fallback | `audio_url = null` + `TTS_UNAVAILABLE`；客户端只显示字幕（AC-09） | 输出 + 截图 |
| D-3 | 停 VM-2 的 asr_gateway | `/api/asr` 返回 503 `ASR_UNAVAILABLE`；客户端切到文本（AC-10） | 输出 + 截图 |
| D-4 | 停 orchestrator 30 s 后恢复 | 客户端显示断线，恢复后 30 s 内自动可用（AC-11） | 时间戳 |
| D-5 | 重启 VM-2（整机） | 重启期间 TTS 由 fallback 接管、ASR 返回 503；开机后容器自动启动，health 恢复 ok | `uptime`、`compose ps`、healthcheck 输出 |
| D-6 | 重启 VM-1（整机） | 客户端显示离线；开机后容器自动启动，客户端自动恢复，证书仍有效 | 同上 + 客户端时间戳 |
| D-7 | 部署一个健康检查会失败的 tag | `update_all.sh` 自动回滚到上一个 tag | `ops.log` |
| D-8 | 备份恢复 | 把 VM-1 的配置备份解包到临时目录，与当前部署目录 `diff`，只差 `.env`（备份不含明文） | 命令输出 |
| D-9 | 两台各 1 小时资源测量（第 2 天 11:00 ~ 12:00） | 满足第 3.2 节判定线 | stats 日志 |

D-5、D-6 会中断服务，只在演练窗口内、拥有者在场时执行。D-8 不覆盖正在运行的配置。

### 9. 风险与降级

不设工时上限后，主要风险来自外部条件和技术不确定性，而不是人手。

| ID | 风险 | 影响 | 处理 |
| --- | --- | --- | --- |
| R-01 | P-01 服务器权限第 1 天未到位 | AC-02、12、13、16 | 第 1 天全部本机完成；第 2 天 09:00 仍未到位，则第 2 天改为“本机 Docker 模拟两台”（两个 compose 项目 + 独立网络），AC-12、13 记 `partial`，写明未在真实 VM 上执行 |
| R-02 | 2 天节奏不足（假设 2 不成立） | 全部 | CP2 判断；先保关键路径（合同 → orchestrator → 客户端文本对话 → 两台部署），A1-09 口型、A1-11 打包、C-08c 更新回滚、B-07 长跑可以后移到缓冲时段；后移项在审计中记 `not_run` |
| R-03 | 1 GiB 内存不够（尤其 VM-1 三个容器） | AC-12 | 第 3.2 节判定线；超限时按 3.2 节顺序调整并记录 |
| R-04 | Live2D 库与 Electron 34 / Vite 6 不兼容 | AC-03、07、08 | 第 1 天 13:00 试验；切社区分支；仍不行则保留 CSS 占位角色，表情/动作以 `data-*` 状态和截图取证，AC-03/07/08 记 `partial`。2 天内不切官方 SDK |
| R-05 | 样例模型表情、动作不足 8 / 7 个 | AC-07、08 | 近似映射，对照表标“近似” |
| R-06 | 无 LLM Key 或 LLM 不按 JSON 输出 | AC-04、07、08 | mock 演示；B-05 解析兜底；Prompt 实测验收线 9/10 |
| R-07 | 无云 ASR Key | AC-05 | mock provider 返回固定文本，链路完整但识别不真实，AC-05 记 `partial` |
| R-08 | 无域名或证书签发失败 | AC-02、05（远程麦克风需安全上下文） | sslip.io（需同意）；再不行 HTTP + 白名单，AC-02 记 `partial`。Electron 本地页面访问 HTTP 后端时麦克风是否可用需实测 |
| R-09 | Azure NSG 默认放行同 VNet | 安全 | C-01 核实后加显式拒绝规则；内部令牌兜底 |
| R-10 | 重启演练导致长时间断连 | 演示 | 只在演练窗口内执行；拥有者在场；确认可用云控制台串行终端 |
| R-11 | 两天内多人同时改公共文件 | 合并冲突 | 第 3.1 节文件负责人；合同冻结后改公共接口需对方在 PR 中确认 |
| R-12 | 演示前最后时刻改代码引入回归 | 演示 | CP7 前 1 小时冻结 `develop`，之后只修演示阻断问题 |

### 10. 验收映射（AC-01 ~ AC-16）

AC-12 原文为“四台 Compose 部署”，本计划按用户修订改为“两台 Compose 部署”，最终审计中注明此修订。

| AC | 内容 | 主责 | 取证时间 | 取证方式 |
| --- | --- | --- | --- | --- |
| AC-01 | Electron 桌宠可启动 | 1 号 | 第 1 天 CP3 | 全新克隆 `npm ci && npm run dev` 输出 + 截图 |
| AC-02 | 连接远端 VM-1 | 1、3、4 号 | CP5 | 客户端截图 + curl https health |
| AC-03 | 加载 Live2D 模型 | 1、2 号 | 第 1 天 18:00 后 | 截图；录屏只记 sha256 |
| AC-04 | 文本输入获得回复 | 1、3 号 | CP4 本机；CP5 远程 | 截图 + 请求记录（令牌脱敏） |
| AC-05 | 语音输入获得回复 | 1、3、4 号 | CP5 | 截图 + 时间戳 |
| AC-06 | TTS 生成并播放 | 4、3、1 号 | CP5 | 录屏（sha256）+ `audio_url` 输出 |
| AC-07 | 按 emotion 切换表情 | 1、2 号 | 第 2 天 M-02 | 8 段录屏（sha256） |
| AC-08 | 按 motion 播放动作 | 1、2 号 | 第 2 天 M-02 | 7 段录屏（sha256） |
| AC-09 | TTS 失败只显示字幕 | 1、3 号 | D-2 | 输出 + 截图 |
| AC-10 | ASR 失败切换文本 | 1、4 号 | D-3 | 输出 + 截图 |
| AC-11 | 断线后重连 | 1、3 号 | D-4、D-6 | 时间戳 |
| AC-12 | 两台 Compose 部署 | 4、3 号 | CP5、D-5、D-6、D-9 | `compose ps`、stats、OOM 检查 |
| AC-13 | 健康检查定位服务 | 4 号 | D-1、D-3 | healthcheck 输出与退出码 |
| AC-14 | 文档完整 | 全员 | CP7 | 文档清单逐项链接 |
| AC-15 | 合规说明完整 | 2 号 | CP7 | `ASSET_SOURCE_TABLE.md` 无空格；`VOICE_POLICY.md`、`LICENSE_NOTICE.md` |
| AC-16 | 非技术用户可部署使用 | 全员 | 第 2 天下午 | 干净机器安装记录 + 非作者部署记录 |

### 11. 决策（启动会一次拍板）

| ID | 内容 | 默认方案（无替代方案时采用） |
| --- | --- | --- |
| D1 | 仓库定位 | 代码仓库方案 |
| D2 | 合同 | 现有 `API_CONTRACT.md` 字段和枚举 + v1 总览 WA-03 ~ WA-09 + 本文第 4 节 |
| D3 | 传输方式 | HTTP + `/api/health` 轮询重连 |
| D4 | 上游用法 | 自建轻量 orchestrator，上游只作参考 |
| D5 | ASR 路线 | VM-2 asr_gateway 代理云 ASR，经 VM-1 转发 |
| D6 | Live2D 模型 | 官方免费样例，只放本机，不公开发布 |
| D7 | 服务器资源 | 本计划改为 2 台；规格以 C-01 核实结果为准 |
| D8 | 公网鉴权 | 共享令牌 + HTTPS + 限流 |
| D9 | 许可证 | 代码 MIT，素材另行授权 |

启动会还需确认：开工前清单状态；第 2 天演练窗口（D-5、D-6 重启）；`develop` → `main` 的审批人。

### 12. 审计输出

- 线程审计：`audit/thread_a1_audit.{md,json}`、`audit/thread_a2_audit.{md,json}`、`audit/thread_b_audit.{md,json}`、`audit/thread_c_audit.{md,json}`，字段沿用 v1 各线程计划第 9 节；C 的 `servers[]` 只有 vm1、vm2 两项，`drills[]` 为 D-1 ~ D-9。
- 服务器核实：`audit/server_verification/<日期>_c01.{md,json}` 与 `latest_c01.{md,json}`，带时间戳的记录不删。
- 最终审计：`audit/final_integration_audit.{md,json}`，逐项给出 AC-01 ~ AC-16 的状态和证据；注明 AC-12 的修订；列出所有降级项（第 9 节）和 `not_run` 项。
- 状态规则：没有证据不写 `pass`；降级完成写 `partial` 并说明；没执行写 `not_run` 并说明原因。MD 与 JSON 结论必须一致。
- 证据规则：截图进 `audit/evidence/<线程>/`；含样例模型的录屏不进仓库，记文件名、sha256、时长和存放位置；命令输出附退出码；地址、令牌、Key 全部脱敏。
- 提交前敏感信息扫描：v1 C 计划 §9.3 的 `git grep` 命令，范围覆盖 `audit/ deploy/ scripts/ docs/ server/`。

### 13. 与 v1 的差异记录

| 项目 | v1 | 2 天版 | 原因 |
| --- | --- | --- | --- |
| 排期 | W0 ~ W6（10-01 ~ 11-13） | 第 1 天、第 2 天 + 7 个检查点 | 用户要求 |
| 服务器 | 4 台 | 2 台（第 3 节） | 用户要求 |
| 工时 | 每人每周约 10 h；超标周有削减清单 | 不设上限，不按工时削减；保留按依赖的降级（第 9 节 R-02） | 用户要求 |
| 决策 | 分 3 个截止日期 | 启动会一次拍板 | 2 天内没有等待窗口 |
| 合同冻结 | 10-15 | 第 1 天 10:30 | 同上 |
| `audio_url` 节点名 | `vm2` / `vm4` | `primary` / `fallback` | 与拓扑解耦，以后增减服务器不改合同 |
| 部署目录 | `vm1-gateway`、`vm2-tts`、`vm3-asr`、`vm4-fallback` | `vm1-gateway`（加 `compose.tts.yaml`）、`vm2-voice` | 2 台拓扑 |
| 健康检查与备份位置 | VM-4 | VM-2 | VM-4 取消 |
| 演练 | D-1 ~ D-8 | D-1 ~ D-9（拆分两台重启，备份恢复改为只读比对） | 2 台拓扑；不覆盖运行中配置 |
| AC-12 | 四台 Compose 部署 | 两台 Compose 部署 | 用户修订 |
| 本计划未验证项 | — | 假设 2（AI 代理产出速度）、两台内存预算、NSG 默认规则、Electron Origin、Live2D 库兼容性、Cubism Core 分发许可 | 需在执行中取证 |

---

## 第 2 部分：线程 A 两天实施计划：客户端 + Live2D + 角色包

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：1 号（A1 客户端 / Live2D）、2 号（A2 角色包 / 合规）
- 上层：2 天总览（本文第 1 部分）（拓扑、时间表、检查点、交接物以总览为准）
- 任务实施细节（代码片段、命令、单测要点）沿用 v1 A 计划（附录 C） 第 4、5 节，本文只写排期和差异

### 1. 范围与完成定义

| AC | 本线程负责的部分 | 2 天内的目标状态 |
| --- | --- | --- |
| AC-01 | 桌宠启动 | `pass`：全新克隆可构建、可启动 |
| AC-03 | 加载样例模型 | `pass`；库不兼容时按总览 R-04 记 `partial` |
| AC-04 | 文本对话 | `pass`（有 LLM Key）；mock 时 `partial` |
| AC-05 | 语音输入 | `pass`（有云 ASR Key）；mock 时 `partial` |
| AC-06 | 播放与口型 | `pass`；口型只做到随机版时 `partial` |
| AC-07、08 | 表情、动作 | 8 / 7 个逐个触发并录屏 |
| AC-09、10、11 | 降级与重连 | 演练 D-2、D-3、D-4、D-6 中客户端表现正确 |
| AC-14、15、16 | 文档、合规、非技术用户 | 客户端使用说明；`ASSET_SOURCE_TABLE.md` 等；干净机器安装记录 |

完成定义：

1. 第 4 节每个块的验证点有证据。
2. `thread-a-desktop`、`thread-a-character` 两个分支 CI 通过，已在第 1 天 CP4 前合入 `develop`。
3. 提交 `audit/thread_a1_audit.{md,json}`、`audit/thread_a2_audit.{md,json}`（第 9 节）。

2 天内不做：正式 Live2D 模型（决策 D6 之后的事）、安装包签名、Electron `safeStorage`、`tapMotions` 以外的交互动作、多角色切换 UI。

### 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| H-04 合同 | 3 号 | 第 1 天 10:30 | 按 v1 总览 WA-03 ~ WA-05 先写，冻结后修订 |
| H-10 orchestrator mock | 3 号 | 第 1 天 13:00 | `VITE_MOCK_CHAT=true` |
| H-11 asr_gateway | 4 号 | 第 1 天 16:00 | `VITE_MOCK_ASR=true` |
| P-09 样例模型 | 2 号 | 开工前 | 第 1 天 09:00 ~ 10:30 内补齐 |
| VM-1 https 地址 | 3、4 号 | 第 2 天 CP5 前 | 先连本机或 VM-1 私网/白名单地址 |
| 干净 Windows（P-08） | 拥有者或 2 号 | 第 2 天 13:00 | Windows Sandbox；都没有记 `not_run` |

客户端不感知服务器数量：`audio_url` 由服务端给出完整地址，节点名改为 `primary`/`fallback`（总览第 4 节）对客户端代码没有影响，只影响测试 fixture 中的示例 URL。

### 3. 文件变更

与 v1 A 计划第 3 节相同，另加：

| 路径 | 动作 | 任务 | 说明 |
| --- | --- | --- | --- |
| `docs/DESKTOP_PET_MODE.md` | 修改 | A1-11、AC-16 | 用户部分：安装、填写服务器地址和令牌、常见问题 |
| `audit/evidence/thread_a1/`、`thread_a2/` | 新建 | 全部 | 截图；录屏只记 sha256 |
| `client/tests/fixtures/`（H-04 前临时） | 新建后删除 | A1-04 | H-04 后改读 `server/common/fixtures/` |

G-02 迁移后客户端路径为 `upstream/Open-LLM-VTuber/client/`，下文简写为 `client/`。

### 4. 时间表

#### 4.1 1 号（A1）

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会 | — |
| D1 09:00 ~ 10:30 | G-02 嵌套目录迁移 + G-03 换行规范化，单个 PR（v1 A 计划 G-02、G-03） | `git ls-files \| grep -c thread-a1_organized` 为 0；manifest 33/33；2 个 `.env.example` 已提取 |
| D1 10:30 ~ 11:30 | A1-01 修构建；G-08 `client.yml` | `npm run build`、`npm test`、`npm run typecheck` 退出码 0；PR 上 CI 绿 |
| D1 11:30 ~ 13:00 | A1-03 枚举；A1-04 合同对齐（按冻结后的 H-04）；A1-05 会话与默认值 | `enums`、`parseChatResponse`、`chatClient`、`contract`、`session`、`config` 单测通过 |
| D1 13:00 ~ 14:00 | A1-07 兼容性试验：pixi-live2d-display + 锁定 pixi.js 版本，在 Electron 34 中加载样例模型 | CP2 前给出结论：可用 / 换社区分支 / 不可用 |
| D1 14:00 ~ 15:00 | A1-06 连接状态与重连；A1-02 窗口实测 | `connectionMonitor`、`healthClient` 单测；M-01 截图 6 张 |
| D1 15:00 ~ 18:00 | A1-07 渲染接入；与 2 号完成 A2-04（H-06，16:00）；A1-08 表情动作映射 + 调试面板 | 样例模型显示，缩放和位置生效；15 个按钮逐个触发 |
| D1 18:00 | CP3：`thread-a-desktop` CI 绿；`VITE_MOCK_CHAT=true VITE_MOCK_ASR=true npm run dev` 可完整演示 | — |
| D1 18:00 ~ 20:00 | A1-09 口型（AnalyserNode）；A1-10 录音 + WAV 编码；导出 H-14 WAV 样例给 4 号 | `lipSync`、`wavEncoder`、`asrClient` 单测；H-14 交付 |
| D1 20:00 ~ 22:00 | 本机集成：连本机 orchestrator，IT-01 ~ IT-08 中客户端部分 | 每个 IT 有截图或时间戳 |
| D2 08:30 ~ 09:00 | 站会 | — |
| D2 09:00 ~ 11:00 | A1-11 Windows 打包；`npx asar list` 检查不含 Cubism Core 和样例模型 | 安装包生成；清单存审计 |
| D2 11:00 ~ 12:00 | 客户端改连 `https://<vm1-domain>`，填令牌，跑远程 IT | CP5：对话、TTS、语音输入成功 |
| D2 13:00 ~ 16:00 | 演练配合（D-2、D-3、D-4、D-6 客户端截图与时间戳）；M-02 表情动作录屏；M-03 口型录屏 | 证据齐全 |
| D2 16:00 ~ 18:00 | `audit/thread_a1_audit.{md,json}`；`DESKTOP_PET_MODE.md` 定稿 | CP7 |

#### 4.2 2 号（A2）

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会；确认 P-09 样例模型 | — |
| D1 09:00 ~ 09:30 | A2-01 `character_pack/ENUM_PROPOSAL.md`（H-01） | 1、3 号在 PR 中确认 |
| D1 09:30 ~ 10:30 | A2-05 `ASSET_SOURCE_TABLE.md`：登记样例模型（作者、链接、许可、用途 `dev_only`）、Cubism Core（`pending`：分发许可未核实） | 11 列无空格 |
| D1 10:30 ~ 12:00 | A2-02 角色 YAML；H-07 `voices.yaml`（12:00 交 4 号） | YAML 字段与 v1 A 计划 A2-02 一致；`voices.yaml` 格式与 4 号对齐 |
| D1 12:00 ~ 13:00 | A2-03 5 个 Prompt + `dialogue_cases.md`（10 条）；H-05 交 3 号 | 3 号 loader 解析通过 |
| D1 13:00 ~ 14:00 | 预读样例模型的表情、动作清单，起草对照表 | 列出 8 个 emotion、7 个 motion 的候选映射，不足的标“近似” |
| D1 14:00 ~ 16:00 | A2-04 `model_dict.json` 开发版（与 1 号，H-06） | A1-07 加载成功；`validateEntry` 无缺失 |
| D1 16:00 ~ 18:00 | A2-06 `VOICE_POLICY.md`、`LICENSE_NOTICE.md`；A2-07 知识文件（≤ 8 KB，不复制官方剧情原文） | 文件已提交；大小检查 |
| D1 18:00 | CP3：`thread-a-character` CI 绿（随 3 号的 `orchestrator.yml` 校验角色包） | — |
| D1 18:00 ~ 22:00 | 本机集成取证：IT-01、IT-04 截图；有 LLM Key 时做 Prompt 10 轮实测（与 3 号） | `dialogue_cases.md` 结果表；验收线 9/10 |
| D2 08:30 ~ 09:00 | 站会 | — |
| D2 09:00 ~ 12:00 | 准备干净 Windows（P-08）；预读 `SERVER_DEPLOYMENT.md`，记录看不懂的步骤反馈给 4 号 | 反馈清单 |
| D2 13:00 ~ 14:30 | 干净机器安装 1 号的安装包：安装、填地址和令牌、对话、卸载（M-07） | 截图 + 耗时 |
| D2 14:30 ~ 16:00 | C-10 非作者部署验证：只看文档，① 在本机 Docker 上从零部署 VM-2 角色（mock provider）并通过健康检查；② 在 VM-2 上执行 `install_vm.sh` 默认 dry-run，不改运行中服务。记录耗时和卡住的步骤 | 记录 + 4 号修订后的文档；没有在真实空白 VM 上部署，AC-16 部署部分最高记 `partial` |
| D2 16:00 ~ 18:00 | `audit/thread_a2_audit.{md,json}`；汇总四份线程审计为 `audit/final_integration_audit.{md,json}`（与拥有者） | CP7 |

### 5. 与 v1 任务细节的差异

| 任务 | v1 | 2 天版 |
| --- | --- | --- |
| G-02 | 冻结嵌套目录后单 PR 迁移 | 不变。第 1 天 09:00 开始前，其他三人不在嵌套目录上开改动；迁移 PR 在 CP1 合并 |
| A1-04 | 过渡期兼容 `reply_text` | 不变。fixture 中的示例 `audio_url` 改为 `/api/audio/primary/<id>.mp3` |
| A1-07 | W2 先做 1.5 h 兼容性试验，失败可评估官方 SDK（+15 h） | 试验放在第 1 天 13:00；2 天内不切官方 SDK，失败按总览 R-04 保留占位角色 |
| A1-08 | `tapMotions` 可后移 | 第 1 天完成 `emotionMap`、`motionMap`；`tapMotions` 只配置 1 个，其余视进度 |
| A1-09 | 可保留随机口型并记 `partial` | 先做 AnalyserNode；跨域音频无数据时回退随机口型，AC-06 口型部分记 `partial` |
| A1-10 | 503 后 60 s 内禁用麦克风 | 不变。远程 HTTP（无证书）时麦克风可用性需实测，结果写入审计 |
| A1-11 | 干净机器由 2 号验证 | 不变，第 2 天下午执行；无干净环境记 `not_run` |
| A2-03 | Prompt 实测由 2 号主导 | 不变，在第 1 天晚间或第 2 天上午、有 LLM Key 时执行 |
| A2-04 | 依赖决策 D6 | 决策 D6 在启动会上取默认（官方样例），A2-04 第 1 天下午完成 |

### 6. 测试

单元测试：沿用 v1 A 计划 §5.1 的 13 个文件。第 1 天 CP3 前必须有的：`enums`、`stateMachine`、`parseChatResponse`、`chatClient`、`mockChatClient`、`contract`、`session`、`config`、`connectionMonitor`、`healthClient`、`modelDict`、`live2dMapping`。`lipSync`、`wavEncoder`、`asrClient`、`pruneAssets` 在第 1 天 CP4 前补齐。

手工测试（证据存 `audit/evidence/thread_a1/`、`thread_a2/`）：

| ID | 场景 | 时间 | 证据 |
| --- | --- | --- | --- |
| M-01 | 窗口透明、置顶、拖动、托盘、Alt+F4、第二实例 | D1 14:00 | 截图 6 张 |
| M-02 | 8 个表情、7 个动作 | D2 下午 | 录屏 15 段（只记 sha256） |
| M-03 | 口型有声 / 静音 | D2 下午 | 录屏 1 段 |
| M-04 | 停 TTS：只显示字幕、无错误（D-2） | D2 演练 | 截图 |
| M-05 | 录音识别；停 ASR 切文本（D-3） | D2 演练 | 截图 + 时间戳 |
| M-06 | 停后端 → 断线 → 恢复（D-4、D-6） | D2 演练 | 时间戳 |
| M-07 | 干净 Windows 安装、对话、卸载 | D2 13:00 | 截图 + 安装包清单 |
| M-08 | Prompt 10 轮实测 | D1 晚或 D2 上午 | `dialogue_cases.md` 结果表 |

### 7. 交付物

| ID | 内容 | 提供 | 截止 | 验收方式 |
| --- | --- | --- | --- | --- |
| H-01 | `ENUM_PROPOSAL.md` | 2 号 | D1 09:30 | 1、3 号确认 |
| H-05 | 角色 YAML + 5 个 Prompt | 2 号 | D1 13:00 | B-04 loader 通过 |
| H-06 | 样例模型说明 + `model_dict.json` | 2 号、1 号 | D1 16:00 | A1-07 加载成功 |
| H-07 | `voices.yaml` | 2 号 | D1 12:00 | tts_gateway 以此启动 |
| H-14 | 客户端录制的 WAV 样例 | 1 号 | D1 20:00 | asr_gateway 校验通过 |
| — | 客户端 Mock 模式 | 1 号 | D1 18:00 | `VITE_MOCK_CHAT=true VITE_MOCK_ASR=true npm run dev` 完整演示 |
| — | Windows 安装包 | 1 号 | D2 11:00 | M-07 |

### 8. 风险

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| Live2D 库不兼容 | AC-03、07、08 | 总览 R-04 |
| Cubism Core 不能随安装包分发（未核实） | AC-01、16 | 安装包不含 Core；文档说明用户自行放置；`ASSET_SOURCE_TABLE.md` 标 `pending` |
| 样例模型表情动作不足 | AC-07、08 | 近似映射并标注 |
| 跨域音频导致口型无数据 | AC-06 | 随机口型回退；确认 B 侧 `/api/audio/*` 的 CORS |
| Electron 打包后 Origin 不在 CORS 白名单 | AC-02 | D2 09:00 打包后立即实测，把实际 Origin 告诉 3 号加入 `CORS_ORIGINS` |
| 1 号负载集中在 D1 下午 | 进度 | CP2 时由 2 号接手 A1-02 截图和 M 系列取证；A1-11 可由 2 号在 1 号指导下执行 |

### 9. 审计

- 文件：`audit/thread_a1_audit.{md,json}`（1 号）、`audit/thread_a2_audit.{md,json}`（2 号），字段沿用 v1 A 计划 §9。
- 另加字段 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}`，记录 CP1 ~ CP7 中与本线程相关的结果。
- A2 额外检查：`git ls-files | grep -Ei '\.moc3$|\.motion3\.json$|\.exp3\.json$|live2dcubismcore'` 期望无输出。

### 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | Electron 打包后实际发送的 Origin | D2 09:00 打包后实测 |
| 2 | pixi-live2d-display 与 Electron 34 / Vite 6 兼容性 | D1 CP2 |
| 3 | Cubism Core 能否随安装包分发 | 2 天内不关闭；`pending` |
| 4 | 远程 HTTP 下麦克风可用性（只在无证书降级时相关） | D2 CP5 |

---

## 第 3 部分：线程 B 两天实施计划：编排 + API + LLM

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：3 号
- 上层：2 天总览（本文第 1 部分）（拓扑、时间表、检查点、交接物以总览为准）
- 任务实施细节（模块划分、代码片段、单测要点）沿用 v1 B 计划（附录 D） 第 3 ~ 5 节，本文只写排期和差异

### 1. 范围与完成定义

| AC / IT | 本线程负责的部分 | 2 天内的目标状态 |
| --- | --- | --- |
| AC-02 | VM-1 orchestrator 对外可用（经 4 号的 Caddy） | `pass`；无证书时 `partial` |
| AC-04 | `/api/chat` 文本对话 | 有 LLM Key：`pass`；mock：`partial` |
| AC-05 | `/api/asr` 代理（B-10） | 有云 ASR Key：`pass`；mock：`partial` |
| AC-06 | TTS 调用、主备切换、音频代理 | `pass` |
| AC-07、08 | 输出枚举规范化 | 未知值回退 `neutral`/`idle`（IT-04） |
| AC-09、11 | `TTS_UNAVAILABLE` 降级；health 汇总 | 演练 D-1、D-2、D-4 结果正确 |
| AC-12 | VM-1 orchestrator 容器（B-09） | `compose ps` healthy；1 小时无 OOM |
| AC-14 | `server/orchestrator/README.md`、合同 v1.0 | 已合并 |

完成定义：

1. B-01 ~ B-10 的验证点有证据。
2. `thread-b-orchestrator` 分支 CI（`orchestrator.yml`）通过，第 1 天 CP4 前已合入 `develop`。
3. 提交 `audit/thread_b_audit.{md,json}`（第 9 节）。

2 天内不做：WebSocket 传输、会话持久化、多 worker、流式输出、上游 Open-LLM-VTuber 后端集成。

### 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| H-01 枚举提案 | 2 号 | D1 09:30 | 用 `API_CONTRACT.md` 现有 8 / 7 个枚举 |
| H-02 内部接口 | 4 号 | D1 09:30 | 用 v1 C 计划 §6.1 原文，`node` 改为 `primary`/`fallback` |
| H-05 角色包 | 2 号 | D1 13:00 | 用 `tests/fixtures/character_pack/` 测试样例 |
| H-08 tts_gateway 本机 | 4 号 | D1 13:00 | `httpx.MockTransport` 单测；联调顺延 |
| H-11 asr_gateway 本机 | 4 号 | D1 16:00 | 同上 |
| H-09 VM 已装 Docker | 4 号 | D1 14:00 | B-09 只做本机 Docker 验证 |
| P-04 LLM Key | 拥有者 | 开工前 | `LLM_PROVIDER=mock` |

### 3. 文件变更

与 v1 B 计划第 3 节相同。差异：

| 路径 | 差异 |
| --- | --- |
| `server/common/schemas/chat_response.json`、`internal_tts.json` | `audio_url` 示例和 `node` 取值为 `primary`/`fallback` |
| `server/orchestrator/app/tts_client.py` | 节点表 `[("primary", TTS_PRIMARY_URL), ("fallback", TTS_FALLBACK_URL)]`，不再写死 VM 编号 |
| `server/orchestrator/app/routes/audio.py` | `{node}` 白名单为 `primary`、`fallback` |
| `deploy/vm1-gateway/.env.example` | `TTS_FALLBACK_URL=http://tts_fallback:8082`；`TTS_PRIMARY_URL`、`ASR_GATEWAY_URL` 指向 `<vm2-private>` |

### 4. 时间表

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会；决策 D2、D3、D4、D8 按默认拍板 | 结论写入启动会记录 |
| D1 09:00 ~ 09:30 | B-01 `docs/UPSTREAM_EVALUATION.md` 定稿（H-03）：沿用已有调研，内存结论标“未实测” | 全员已读 |
| D1 09:30 ~ 10:30 | B-02 合同 v1.0：`docs/API_CONTRACT.md` + 8 个 schema + 15 个 fixtures；并入 H-01、H-02 | `test_fixtures_schema.py` 通过；四人在 PR 中确认；CP1 合并（H-04） |
| D1 10:30 ~ 13:00 | B-03 骨架：config、`/api/health`、`/api/chat`（mock LLM 与触发词）、`/api/characters`、错误对象；B-08 鉴权、CORS、日志；`orchestrator.yml` | `test_config`、`test_chat`、`test_health`、`test_errors`、`test_security` 通过；H-10：1 号对本机 12393 完成一次对话 |
| D1 13:00 ~ 14:30 | B-04 角色包加载（接 H-05）；B-05 LLM 适配与解析 | `test_characters`、`test_real_pack`、`test_llm_parse`、`test_llm_openai` 通过 |
| D1 14:30 ~ 16:30 | B-06 TTS 客户端、主备切换、熔断、音频代理（接 H-08） | `test_tts_client`、`test_audio_proxy` 通过；本机 tts 两个进程，停 primary 后 `node=fallback` |
| D1 16:30 ~ 18:00 | B-07 会话；B-08 限速与并发；B-10 `/api/asr` 代理（接 H-11） | `test_sessions`、`test_asr_proxy` 通过；样例 WAV 经本机 12393 返回文字 |
| D1 18:00 | CP3：`thread-b-orchestrator` CI 绿；`test_contract_responses.py` 通过 | — |
| D1 18:00 ~ 20:00 | B-09 `Dockerfile`、`deploy/vm1-gateway/compose.yaml`、`.env.example`（H-13，20:00）；本机 `docker compose up` 验证 | 容器 healthy；`docker stats` 低于 256m |
| D1 20:00 ~ 22:00 | 按顺序合入 `develop`（总览 8.1）；本机集成 IT-01 ~ IT-08（v1 B 计划 §5.3 的触发方法）；B-07 长跑（本机 Docker，`mem_limit 256m`） | IT 结果表；长跑内存增长 < 20 MiB |
| D2 08:30 ~ 09:00 | 站会 | — |
| D2 09:00 ~ 11:00 | B-09 VM-1 部署：orchestrator 先绑私网地址，VM-1 本机 curl chat；与 4 号叠加 tts_fallback、caddy；证书签发后改绑 `127.0.0.1` | `compose ps` healthy；经 https 的 health 返回 `tts=ok`、`asr=ok` |
| D2 11:00 ~ 12:00 | 远程 IT-01 ~ IT-08；有 LLM Key 时与 2 号做 Prompt 10 轮实测；D-9 期间每分钟 1 次 `/api/chat` | CP5；`dialogue_cases.md` 结果表 |
| D2 13:00 ~ 16:00 | 13:00 ~ 13:30 准备演练用的请求脚本（4 号部署 C-08b/c）；13:30 起与 4 号执行演练 D-1 ~ D-8，负责 orchestrator 侧输出（`audio_url` 节点、错误码、health 字段） | 每项命令输出 |
| D2 16:00 ~ 18:00 | `audit/thread_b_audit.{md,json}`；`server/orchestrator/README.md` 定稿 | CP7 |

### 5. 与 v1 任务细节的差异

| 任务 | v1 | 2 天版 |
| --- | --- | --- |
| B-01 | 3 h 调研，10-12 交付 | 沿用已有调研结论（依赖重、推测超过 256m，未实测），D1 09:30 定稿 |
| B-02 | 10-13 发 PR，10-15 合并 | D1 10:30 合并；评审在 PR 内同步进行，四人当场确认 |
| B-03 | 骨架在 D2 前、业务在 D2 后 | 合同冻结后一次完成 |
| B-06 | 节点 `vm2` → `vm4`；熔断可后移 | 节点 `primary` → `fallback`；熔断 30 s 当天完成 |
| B-06 health | — | `tts` 字段按总览第 4 节：两个节点都 ok → `ok`；一个 → `degraded`；都不通 → `down` |
| B-07 长跑 | 1000 会话 / 5000 请求 | 不变，放在 D1 晚间本机 Docker 内执行 |
| B-09 | W5 实机；只交 orchestrator | 第 2 天上午实机；`compose.yaml` 与 4 号的 `compose.caddy.yaml`、`compose.tts.yaml` 叠加，服务名 `orchestrator` 不变 |
| B-10 | 大小预检可后移 | 当天完成：按字节计数读取，1 MB 上限 |
| CORS | `CORS_ORIGINS` 含 `http://127.0.0.1:5173` 和 `null` | D2 09:00 1 号报告打包后实际 Origin，B 当天更新 `.env` |

### 6. 测试

- 单元测试：沿用 v1 B 计划 §5.1，全部在 D1 CP3 前通过；`test_tts_client.py` 的节点名改为 `primary`/`fallback`，增加“只剩一个节点时 health 为 `degraded`”。
- 合同测试：`test_fixtures_schema.py`、`test_contract_responses.py`（v1 B 计划 §5.2）。
- 本机集成：总览 8.2；IT 触发方法见 v1 B 计划 §5.3，其中 IT-05 改为“停 primary 和 fallback 两个 tts 进程”。
- 远程：D2 上午远程 IT；D2 下午演练 D-1 ~ D-8。
- CI：`orchestrator.yml`，`pytest -q -m "not llm_live"`；`llm_live` 用例只在有 Key 时本机执行，结果记入审计。

### 7. 交付物

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-03 | `docs/UPSTREAM_EVALUATION.md` | D1 10:00 | 全员已读 |
| H-04 | 合同 v1.0 + schemas + fixtures | D1 10:30 | 四人确认；schema 校验通过 |
| H-10 | orchestrator 本机 mock 模式 | D1 13:00 | 1 号完成一次对话 |
| H-13 | `deploy/vm1-gateway/compose.yaml` + `.env.example` | D1 20:00 | 4 号叠加两个文件启动成功 |
| — | mock LLM 触发词（`/mock:bad_json`、`/mock:unknown_enum`、`/mock:timeout`、`/mock:error`、`/mock:long`） | 随 H-10 | 1 号复现 IT-04、IT-08 |

本机运行命令沿用 v1 B 计划 §6，写入 `server/orchestrator/README.md`。

### 8. 风险

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| D1 10:30 合同未冻结 | 三线程返工 | 最晚 12:00 冻结（总览 CP1）；冻结前各线程按 WA 默认 |
| LLM 不按 JSON 输出 | AC-04、07、08 | B-05 解析兜底；2 号改 Prompt |
| 无 LLM Key | AC-04 | mock 演示，`partial` |
| VM-1 内存紧张（三个容器） | OOM | 单 worker、会话上限 500；超判定线按总览 3.2 调整 |
| 共享令牌泄露 | 滥用、费用 | 限速、并发上限；轮换步骤写入 C-10 |
| `audio_url` 免令牌 | 隐私 | 沿用 v1：`audio_id` 含 voice/speed/emotion；缓存 72 h；已登记为接受的风险 |

### 9. 审计

- 文件：`audit/thread_b_audit.{md,json}`，字段沿用 v1 B 计划 §9（`contract`、`llm_live`、`soak` 等）。
- 另加 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}` 和 `remote_it[]{id,result,evidence}`（D2 远程 IT 结果）。
- 证据中的令牌一律写 `***`，地址写 `<vm1-domain>`、`<vm2-private>`。

### 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | `character_id` 可省略、`text` ≤ 500 字、请求体 ≤ 16 KB、同时失败时 `error` 优先 `LLM_*` | D1 CP1 合同评审 |
| 2 | Electron 打包后的 Origin 是否需要加入 `CORS_ORIGINS` | D2 09:00 后（1 号实测） |
| 3 | 256m 是否够用（含 B-07 长跑） | D1 晚间本机；D2 D-9 实机 |

---

## 第 4 部分：线程 C 两天实施计划：TTS/ASR + 两台服务器部署

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：4 号
- 上层：2 天总览（本文第 1 部分）（拓扑、时间表、检查点、交接物以总览为准；两台拓扑见总览第 3 节）
- 任务实施细节（网关模块、缓存、音频校验、脚本规则、Caddyfile）沿用 v1 C 计划（附录 E） 第 4 ~ 6 节，本文只写排期和两台方案带来的差异

### 1. 范围与完成定义

| AC | 本线程负责的部分 | 2 天内的目标状态 |
| --- | --- | --- |
| AC-02 | VM-1 HTTPS 入口（Caddy） | `pass`；无域名降级时 `partial` |
| AC-05 | asr_gateway | 有云 ASR Key：`pass`；mock：`partial` |
| AC-06 | tts_gateway（primary、fallback） | `pass` |
| AC-09、10 | 网关故障语义（503） | 演练 D-1、D-2、D-3 结果正确 |
| AC-12 | 两台 Compose 部署 | `compose ps` healthy；D-5、D-6 重启自启；D-9 无 OOM |
| AC-13 | `healthcheck.sh` 定位故障服务 | D-1、D-3 输出指出具体主机和服务，退出码正确 |
| AC-14、16 | `SERVER_DEPLOYMENT.md`、`TTS_ASR_GUIDE.md` | 非作者验证有记录（2 号，D2 下午） |

完成定义：

1. C-01 ~ C-10 的验证点有证据（命令 + 脱敏输出）。
2. `thread-c-voice-ops` 分支 CI（`voice-ops.yml`）通过，D1 CP4 前已合入 `develop`。
3. 提交 `audit/thread_c_audit.{md,json}` 和 `audit/server_verification/` 下的核实记录（第 9 节）。

2 天内不做：告警推送、Azure TTS provider（O-01 有 Key 也只做 edge_tts + mock）、镜像仓库（各 VM 本地构建）、日志集中收集。

### 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| P-01 VM 登录与 NSG 权限 | 拥有者 | 开工前 | 只做本机开发；D2 09:00 仍未到位按总览 R-01 用本机 Docker 模拟两台 |
| P-02 同一 VNet | 拥有者 | 开工前 | 改走公网地址 + NSG 白名单 + 内部令牌，在 C-01 记录 |
| P-03 域名 | 拥有者 | D2 09:00 | sslip.io（需同意）；再不行 HTTP + 团队 IP 白名单 |
| P-05 云 ASR Key | 拥有者 | 开工前 | `ASR_PROVIDER=mock` |
| H-04 合同 | 3 号 | D1 10:30 | 按 H-02 自己的提案先写 |
| H-07 `voices.yaml` | 2 号 | D1 12:00 | 用 v1 C 计划 C-02 中的提案格式，单音色 `zh-CN-XiaoyiNeural` |
| H-13 VM-1 `compose.yaml` | 3 号 | D1 20:00 | `compose.caddy.yaml`、`compose.tts.yaml` 先单独验证 |
| H-14 WAV 样例 | 1 号 | D1 20:00 | 用 Python `wave` 生成的 16 kHz 测试音频 |

### 3. 文件变更（取代 v1 C 计划第 3 节中的部署部分）

服务代码（`server/tts_gateway/`、`server/asr_gateway/`）、`scripts/` 与 v1 相同。部署目录改为：

| 路径 | 动作 | 任务 | 说明 |
| --- | --- | --- | --- |
| `deploy/vm1-gateway/compose.tts.yaml` | 新建 | C-06 | 服务 `tts_fallback`；端口 `${PRIVATE_BIND_ADDR:?}:8082:8082`；`mem_limit: 256m`；独立缓存卷 `tts_cache_fallback`；卷与环境变量和 `vm2-voice` 的 tts 服务一致 |
| `deploy/vm1-gateway/.env.tts.example` | 新建 | C-06 | `TTS_*`、`VOICE_MAP_FILE`、`INTERNAL_TOKEN`。与 orchestrator 的 `.env` 分开，避免 LLM Key 进入 TTS 容器 |
| `deploy/vm1-gateway/compose.caddy.yaml`、`Caddyfile` | 新建 | C-09 | 同 v1 C 计划 §4.9 |
| `deploy/vm2-voice/compose.yaml` | 新建 | C-03 | 服务 `tts_gateway`（8082）、`asr_gateway`（8083），都绑 `${BIND_ADDR:?}`（VM-2 私网地址），各 `mem_limit: 256m`，`restart: unless-stopped` |
| `deploy/vm2-voice/.env.tts.example`、`.env.asr.example` | 新建 | C-03 | 两个服务各用自己的 env 文件，ASR Key 不进 TTS 容器 |
| `deploy/vm2-voice/cron.example` | 新建 | C-06 | 健康检查每 5 分钟；备份每日 03:30 |
| `deploy/vm2-voice/README.md` | 新建 | C-10 | 指向 `SERVER_DEPLOYMENT.md` |
| `deploy/vm2-tts/`、`vm3-asr/`、`vm4-fallback/` 的 `README.md` | 修改首行 | — | 注明“2 台方案下停用，见 `deploy/vm2-voice/`”；不删除（总览 3.1） |
| `scripts/hosts.example.conf` | 新建 | C-07 | 4 行，见 §5.2 |
| `audit/server_verification/<日期>_c01.{md,json}`、`latest_c01.{md,json}` | 新建 | C-01 | 已脱敏 |
| `audit/thread_c/` | 新建 | C-03 ~ D-9 | stats 日志、演练记录（已脱敏） |
| `audit/thread_c_audit.{md,json}` | 新建 | 全部 | 第 9 节 |

### 4. 时间表（4 号）

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会；确认 P-01、P-02、P-06；决策 D5、D7 按默认拍板 | 结论写入启动会记录 |
| D1 09:00 ~ 09:30 | H-02 内部接口提案（v1 C 计划 §6.1；`audio_id` 规则不变，orchestrator 对外节点名按总览第 4 节改为 `primary`/`fallback`） | 3 号并入 B-02 |
| D1 09:30 ~ 10:30 | C-01 两台 VM 只读核实（§5.1） | 记录已脱敏存档；H-09 第一部分 |
| D1 10:30 ~ 13:00 | C-02 tts_gateway：mock provider、`audio_id`、缓存、`voices.yaml`（接 H-07）、内部令牌、错误语义；同时编写 C-08a `install_vm.sh`（默认 dry-run） | `test_validation`、`test_audio_id`、`test_cache`、`test_auth`、`test_errors`、`test_mp3`、`test_voices`、`test_audio_get` 通过；H-08：3 号本机调用成功 |
| D1 13:00 ~ 14:00 | C-08a 在两台执行：先 dry-run，再 `--apply --approved-by <拥有者>`（Docker + swap，不加 `--firewall`）；NSG 规则（总览 3.3）提交拥有者审批后配置 | 第二次执行无变化；`docker version`、`swapon --show`；H-09 第二部分 |
| D1 14:00 ~ 16:00 | C-04 asr_gateway：音频校验、mock、云 ASR 映射、隐私 | `test_audio_validation`、`test_mock`、`test_cloud_mapping`、`test_privacy` 通过；H-11 |
| D1 16:00 ~ 17:00 | C-02 edge_tts provider；有 Key 时云 ASR 本机实测 | `@pytest.mark.network` 用例本机通过，结果记入审计 |
| D1 17:00 ~ 18:00 | C-07 `healthcheck.sh` + `test_healthcheck.py`；`voice-ops.yml`；`deploy/vm2-voice/` 文件 | `shellcheck`、`bash -n` 通过；`docker compose config` 无错；CP3：`thread-c-voice-ops` CI 通过 |
| D1 18:00 ~ 20:00 | C-03 / C-05 VM-2 部署 `deploy/vm2-voice/`（tts 用 edge_tts，不需要 Key；asr 有 Key 用真实值，否则 mock）；编写 `compose.tts.yaml`、`compose.caddy.yaml`、`Caddyfile`（C-06、C-09 文件部分） | VM-2 `compose ps` healthy；VM-1 经私网 curl `/api/tts`、`/api/asr` 返回 200；管理端直连 8082/8083 失败 |
| D1 20:00 ~ 22:00 | 合入 `develop`（总览 8.1，第二个合并）；与 3 号本机集成（4 进程）；用 H-14 WAV 验证 asr_gateway；C-10 初稿（按 VM-2 实际部署步骤写，供 2 号第 2 天上午预读） | IT-02、IT-03、IT-05、IT-06 结果；与 H-13 叠加后 `docker compose config` 无错；CP4；初稿已提交到 PR |
| D2 08:30 ~ 09:00 | 站会；确认演练窗口 | — |
| D2 09:00 ~ 11:00 | VM-2 复核（D1 晚间未完成时在此补做）；VM-1：叠加 `compose.tts.yaml`（tts_fallback）和 `compose.caddy.yaml`（与 3 号的 `compose.yaml`）；证书签发；VM-2 安装健康检查 cron | `curl https://<vm1-domain>/api/health` 返回 `tts=ok`、`asr=ok`；`curl -sI http://<vm1-domain>/` 返回 308；healthcheck 全部 ok，退出码 0 |
| D2 11:00 ~ 12:00 | D-9 两台 1 小时资源测量（§5.6）；测量期间不改远程服务，只在本机写 C-08b `backup_config.sh`、C-08c `update_all.sh` 和 `test_ops_dryrun.py` | stats 日志；dry-run 输出不含令牌和地址；CP5 |
| D2 13:00 ~ 13:30 | 两台部署 C-08b/c；VM-2 加备份 cron；拥有者授权后配置受限备份密钥；手动执行一次 `backup_config.sh --pull` | `tar -tzf` 不含 `.env`；VM-2 上有 VM-1 的备份包 |
| D2 13:30 ~ 16:00 | 与 3 号执行演练 D-1 ~ D-8（总览 8.4，C 侧细节见 §5.4、§5.5）；根据 2 号的非作者验证修订 C-10 | 每项命令输出；文档修订记录；CP6 |
| D2 16:00 ~ 18:00 | 关闭 NSG 12393 临时放行；敏感信息扫描；`audit/thread_c_audit.{md,json}` | CP7 |

### 5. 两台方案的任务差异

#### 5.1 C-01 服务器核实

沿用 v1 C 计划 §4.1 的只读命令和脱敏模板，记录表改为两列（vm1、vm2）。另加 3 项：

1. 两台是否在同一 VNet / 子网，从 VM-1 `nc -zv <vm2-private> 22` 是否连通（只测连通，不登录）。
2. NSG 当前入站规则清单（门户或 `az network nsg rule list` 只读），确认默认规则是否放行同 VNet 流量（关闭总览待决项 R-09）。
3. 磁盘可用空间是否 ≥ 5 GiB（swap 与镜像构建）。

#### 5.2 C-07 健康检查

`scripts/hosts.example.conf`：

```text
# vm   service        url
vm1    orchestrator   https://<vm1-domain>/api/health
vm1    tts_gateway    http://<vm1-private>:8082/api/health   # tts_fallback，只绑私网地址
vm2    tts_gateway    http://<vm2-private>:8082/api/health   # primary
vm2    asr_gateway    http://<vm2-private>:8083/api/health
```

- 运行位置：VM-2 的 cron（`*/5 * * * *`，写 `health.log` 和 `health.latest`）。脚本不依赖所在主机，VM-1 也能手动运行。
- VM-2 整机停机（D-5）时 cron 不运行：在 VM-1 上手动执行 healthcheck，期望 vm2 两行 down、退出码 2；同时 orchestrator health 应为 `tts=degraded`、`asr=down`。
- 输出格式、判定规则、退出码与 v1 C 计划 §4.7 相同。

#### 5.3 C-06 备用 TTS 与备份

- 备用 TTS 在 VM-1（`tts_fallback`），镜像和 `IMAGE_TAG` 与 VM-2 相同，缓存卷独立。
- 备份内容与 v1 C 计划 §4.6 的表相同（不备份 `.env` 明文，只记键名和 8 位哈希）。存放：
  - 每台本地保留 3 份；
  - VM-2 每日用受限密钥拉取 VM-1 的 `backup_config.sh --emit`，保留 14 份；VM-2 自身的备份只在本地；
  - 受限密钥需要拥有者授权；未授权时两台只做本地备份，4 号在演练后手动取回一份到团队存储。
- 已知局限：VM-2 整机丢失时其自身配置备份同时丢失，恢复依赖 git 仓库中的部署文件和密码管理器中的 `.env` 值。写入 C-10 和审计 `open_items`。

#### 5.4 C-08 安装、更新、回滚

- `install_vm.sh --role vm1|vm2`。其他规则不变：默认 dry-run；`--apply` 需 `--approved-by`；防火墙只在 `--firewall` 时执行且禁止 `ufw reset`。2 天内不执行 `--firewall`，网络控制靠 NSG + 绑定地址。
- `update_all.sh --tag <tag>` 顺序改为 VM-2 → VM-1：
  1. 先在目标 VM 上 `docker compose build`，再 `up -d`，缩短停机时间。
  2. VM-2 更新期间 TTS 由 VM-1 的 fallback 接管，ASR 短暂返回 503（只在演练窗口执行）。
  3. VM-2 健康检查失败时自动回滚并停止，VM-1 不受影响。
  4. 每个服务保留最近 2 个 tag 的镜像。
- D-7 回滚演练不向远程推任何东西：在 VM-2 的工作副本上建本地分支 `drill-bad-health`，提交一处会让 tts_gateway 启动校验失败的改动，打本地 tag `drill-bad`，执行 `update_all.sh --tag drill-bad`；期望自动回滚到上一个 tag。演练后删除这个本地 tag 和分支。

#### 5.5 演练中 C 侧的检查

| 演练 | C 侧操作与证据 |
| --- | --- |
| D-1 | `docker compose stop tts_gateway`（VM-2）；healthcheck 输出 + 退出码 2 |
| D-2 | 再 `stop tts_fallback`（VM-1）；healthcheck 两行 tts down |
| D-3 | `stop asr_gateway`（VM-2）；healthcheck 输出 |
| D-5 | 拥有者在场，`sudo reboot`（VM-2）；在 VM-1 手动 healthcheck；开机后 `uptime`、`compose ps`、cron 恢复运行 |
| D-6 | 拥有者在场，重启 VM-1；开机后 `compose ps`、证书有效期（`openssl s_client`） |
| D-7 | 见 §5.4 |
| D-8 | VM-2 上 `tar -tzf` 确认拉取到的 VM-1 备份包完整且不含 `.env`，记录 sha256；在 VM-1 上把本地最近一份备份解包到临时目录（受限密钥只能执行 `--emit`，不回传），`diff -r` 对比部署目录，期望只差 `.env`，然后删除临时目录 |
| D-9 | §5.6 |

每项演练后先恢复服务、确认 healthcheck 全部 ok，再做下一项。

#### 5.6 资源测量（D-9）

两台同时测 1 小时（D2 11:00 ~ 12:00），命令沿用 v1 C 计划 §4.11，结果存 `audit/thread_c/<vm>_stats_<日期>.log`（复制前脱敏）。负载：3 号每分钟经 https 发 1 次 `/api/chat`（含 TTS），每 5 分钟 1 次 `/api/asr`。判定线见总览 3.2；超限时按总览 3.2 的顺序调整并复测 30 分钟。

#### 5.7 与 v1 的差异汇总

| 项 | v1 | 2 天版 |
| --- | --- | --- |
| 拓扑 | VM-2 tts、VM-3 asr、VM-4 备用 tts + cron | VM-2 tts（primary）+ asr + cron；VM-1 备用 tts（fallback）（总览 3.1） |
| C-01 | 4 台核实 | 2 台核实 + VNet / NSG / 磁盘 3 项（§5.1） |
| C-03、C-05 | 两个部署目录 | 合并为 `deploy/vm2-voice/`，同一天晚间部署 |
| C-06 | VM-4 独立部署 | VM-1 叠加 `compose.tts.yaml`；备份拉取改由 VM-2 执行（§5.3） |
| C-07 | 运行在 VM-4 | 运行在 VM-2；D-5 期间在 VM-1 手动运行（§5.2） |
| C-08a | `--role` 取 vm1 ~ vm4 | `--role` 取 vm1 或 vm2 |
| C-08c | VM-4 → VM-2 → VM-3 → VM-1 | VM-2 → VM-1（§5.4） |
| C-10 非作者验证 | 3 号或 2 号，在一台 VM 从零部署 | 2 号，在本机 Docker 按文档部署 + VM-2 上 `install_vm.sh` dry-run；不改动正在运行的服务，AC-16 部署部分最高 `partial`（A 计划 §4.2） |
| 削减顺序 | v1 §7 按工时削减 | 取消；落后时按总览第 6 节检查点处理 |

### 6. 测试

- 单元测试：沿用 v1 C 计划 §5.1，全部在 D1 CP3 前通过。差异：
  - `test_healthcheck.py` 的桩配置改为 4 行（vm1 两行、vm2 两行），增加“vm1 tts_gateway down、其余 ok → 退出码 2，`failed=vm1/tts_gateway`”。
  - `test_ops_dryrun.py` 增加 `update_all.sh` 的 dry-run 顺序断言（VM-2 在 VM-1 之前）和 `install_vm.sh --role vm3` 被拒绝（退出码 3）。
- 合同测试：沿用 v1 C 计划 §5.2；H-04（D1 10:30）之后删除本地 schema 副本。
- 本机集成：总览 8.2（4 进程：orchestrator 12393、tts 8082 primary、tts 8084 fallback、asr 8083）。
- 部署验证：
  - `docker compose config`（两台各自的叠加组合）无错；
  - 管理端直连 VM-2 的 8082/8083 和 VM-1 的 8082 必须失败；
  - 从 VM-1 访问 VM-2 的 8082/8083 成功，带错误令牌返回 401。
- 演练：总览 8.4 的 D-1 ~ D-9，C 侧证据见 §5.5。
- CI：`voice-ops.yml`，`pytest -q -m "not network"` + `shellcheck scripts/*.sh`；`network` 用例只在本机执行，结果记入审计。

### 7. 交付物

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-02 | 内部接口提案（v1 C 计划 §6.1，节点名按总览第 4 节） | D1 09:30 | 3 号并入合同 v1.0 |
| H-08 | tts_gateway 本机可运行（mock；edge_tts 在 D1 17:00 前补上） | D1 13:00 | 3 号按 README 启动，`/api/tts` 返回音频 |
| H-09 | C-01 核实记录；两台已装 Docker + swap | D1 10:30；14:00 | 3 号确认记录；两台 `docker compose version` |
| H-11 | asr_gateway 本机可运行（mock） | D1 16:00 | 1、3 号用样例 WAV 调用成功 |
| — | `TTS_MOCK_FAULT`、`ASR_MOCK_FAULT` 故障注入 | 随 H-08、H-11 | 3 号本机复现 IT-05、IT-06 |
| — | `compose.tts.yaml`、`compose.caddy.yaml`、`Caddyfile` | D1 22:00 | 与 H-13 叠加后 `docker compose config` 无错 |
| — | `docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` 初稿 / 定稿 | D1 22:00 / D2 16:00 | 2 号非作者验证记录 |

本线程接收：H-04（D1 10:30）、H-07（D1 12:00）、H-13（D1 20:00）、H-14（D1 20:00），以及开工前清单 P-01、P-02、P-03、P-05（总览第 2 节）。

### 8. 风险

总览第 9 节为公共风险；下表只列 C 侧特有项。

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| Edge TTS 非官方，可能限流或失效 | AC-06 | primary 与 fallback 同 provider，无法互相兜底；全部失败时只显示字幕（AC-09），审计写明。有 Azure Key 也不在 2 天内接入 |
| VM-1 承载三个容器 + Caddy 证书 | OOM、入口不可用 | 总览 3.2 判定线；先降 tts_fallback 到 192m |
| VM-2 整机故障 | ASR 不可用、健康检查和 VM-2 自身备份不可用 | TTS 由 fallback 接管；ASR 降级到文本输入（AC-10）；VM-2 配置以 git + 密码管理器恢复（§5.3） |
| Docker 端口绕过 ufw | 内网服务暴露 | 绑定地址 + NSG；管理端直连测试必须失败（§6） |
| NSG 默认放行同 VNet | 来源限制失效 | C-01 核实；显式拒绝规则；内部令牌 |
| NSG 或 ufw 修改导致 SSH 断连 | 失去访问 | 2 天内不执行 `--firewall`；NSG 改动先放行 22；拥有者在场；串行控制台兜底 |
| 证书申请失败 | AC-02 | 总览 R-08 |
| 审计文件泄露地址或令牌 | 安全 | 提交前执行 v1 C 计划 §9.3 扫描；地址只写占位符 |
| 云 ASR 费用 | 成本 | 免费层额度（需验证）；并发 2；单次 ≤ 30 s |
| D1 晚间 VM-2 部署未完成 | CP5 | D2 09:00 先补 VM-2，再做 VM-1；仍未完成时 CP5 只验证文本对话，TTS/ASR 进缓冲时段 |

### 9. 审计

- 文件：
  - `audit/thread_c_audit.{md,json}`，结论一致，格式沿用工作报告 v2；
  - `audit/server_verification/<日期>_c01.{md,json}` 与 `latest_c01.{md,json}`（带时间戳的记录不删）；
  - `audit/thread_c/`：stats 日志、演练记录（已脱敏）。
- JSON 字段沿用 v1 C 计划 §9.2，差异：
  - `servers[]` 只有 `vm1`、`vm2` 两项，`role` 写实际承载的服务；
  - `drills[]` 为 D-1 ~ D-9（编号按总览 8.4，与 v1 不同）；
  - 新增 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}`；
  - `open_items[]` 记录 VM-2 自身备份的局限（§5.3）和 AC-12 文字由“四台”改为“两台”的修订。
- 提交前执行 v1 C 计划 §9.3 的敏感信息扫描，结果写入 `sensitive_scan`。

### 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | 两台是否同一 VNet；NSG 默认是否放行同 VNet | D1 10:30（C-01） |
| 2 | VM-1 三个容器的内存是否在判定线内 | D2 12:00（D-9） |
| 3 | 受限备份密钥是否获得拥有者授权 | D2 13:00 |
| 4 | Caddy 当前版本是否记录 `Authorization` 头 | D2 上午证书签发后查看日志 |
| 5 | 云 ASR 免费层额度 | P-05 到位时 |
| 6 | 旧部署目录 `deploy/vm2-tts/`、`vm3-asr/`、`vm4-fallback/` 是否删除 | 拥有者决定；2 天内不删 |

---

## 附录 A：v1 执行计划书节选（第 3 节 S0 治理任务、第 7 节 S3 集成、第 9 节决策时间表）

- 来源：`docs/EXECUTION_PLAN.md`。未收录的小节（如第 1、2、7、8、10 节）已被正文取代，需要时查源文件
- 已被取代的内容：第 9 节的截止日期已被正文第 1 部分第 11 节（启动会一次拍板）取代；决策 D5、D7 的默认方案以正文为准。

### 3. S0 治理任务

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

### 7. S3 集成

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

### 9. 决策时间表

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

---

## 附录 B：v1 总览节选（第 3 节公共工作假设 WA-01 ~ WA-12）

- 来源：`docs/implementation/README.md`。未收录的小节（如第 1、2、7、8、10 节）已被正文取代，需要时查源文件
- 已被取代的内容：WA-01、WA-08 的四台部分及 WA-06 的节点名已被正文第 1 部分第 3、4 节取代。

### 3. 公共工作假设（WA）

以下是实施用的提案，不是冻结合同。D2 由 3 号主导冻结后，以 `docs/API_CONTRACT.md` v1.0 为准，三份实施计划同步修订。

#### WA-01 服务、端口与路径

| 服务 | 主机 | 端口 | 代码目录 | 部署目录 |
| --- | --- | --- | --- | --- |
| orchestrator | VM-1 | 12393（Caddy 443 反代） | `server/orchestrator/` | `deploy/vm1-gateway/` |
| tts_gateway（主） | VM-2 | 8082 | `server/tts_gateway/` | `deploy/vm2-tts/` |
| asr_gateway | VM-3 | 8083 | `server/asr_gateway/` | `deploy/vm3-asr/` |
| tts_gateway（备）+ 健康检查 + 备份 | VM-4 | 8082 | 同上 | `deploy/vm4-fallback/` |
| 客户端 | 本地 | 开发 5173 | `upstream/Open-LLM-VTuber/client/` | — |

客户端默认后端改为 `http://127.0.0.1:12393`。公共 schema 与样例放在 `server/common/schemas/`、`server/common/fixtures/`，由 3 号维护。

#### WA-02 技术栈

- 服务端：Python 3.11、FastAPI、uvicorn、httpx、pydantic v2、PyYAML、pytest；Docker 镜像基于 `python:3.11-slim`；依赖锁定精确版本。
- 客户端：沿用现有 Electron 34 + React 19 + Vite 6 + vitest。
- 每个 Python 容器 `mem_limit: 256m`；每台 VM 建议配 1 GiB swap（4 号评估）。

#### WA-03 `POST /api/chat`（VM-1 公网）

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

#### WA-04 枚举

- emotion：`neutral`、`smile`、`serious`、`worried`、`sad`、`surprised`、`thinking`、`confident`。
- motion：`idle`、`greeting`、`nod`、`shake`、`think`、`encourage`、`battle_ready`。
- 服务端出口校验：未知值改为 `neutral` / `idle`。客户端入口再校验一次（双保险）。
- 客户端内部状态（`speaking`、`error` 等）不出现在合同中。

#### WA-05 错误对象与状态码

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

#### WA-06 语音输入与音频播放

语音输入：客户端 → VM-1 `POST /api/asr` → orchestrator 转发 VM-3 → 返回文字 → 客户端以 `input_type: "voice"` 调用 `/api/chat`。

- 请求：`multipart/form-data`，字段 `file`（WAV，16 kHz，单声道，16 bit，最长 30 秒，最大 1 MB），字段 `language`（默认 `zh-CN`）。客户端负责把录音转换为该格式。
- 响应：`{"text": "…", "provider": "…", "confidence": 0.91 或 null, "error": null}`。
- VM-3 不可用或超时：HTTP 503 + `ASR_UNAVAILABLE`，客户端提示并切换到文本输入。未识别到语音：HTTP 200 + `text: ""` + `ASR_EMPTY`。

音频播放：VM-2/VM-4 不暴露公网。orchestrator 把 TTS 结果改写为 `audio_url = {PUBLIC_BASE_URL}/api/audio/{node}/{audio_id}.mp3`（`node` 为 `vm2` 或 `vm4`），并代理 `GET` 请求到对应节点。`audio_id` 为 `sha256(voice_id|speed|emotion|text)` 前 32 位十六进制，只由 tts_gateway 计算并返回；orchestrator 原样透传，不自行计算。计算前先规范化：`voice_id`、`emotion` 取回退后的值，`speed` 格式化为两位小数，`text` 做 NFC 并去掉首尾空白。网关内部音频路径为 `GET /api/audio/{audio_id}.mp3`（需 `X-Internal-Token`），orchestrator 映射为对外的 `/api/audio/{node}/{audio_id}.mp3`。

#### WA-07 健康检查与重连

- 所有服务提供 `GET /api/health`，不需要令牌。
- orchestrator 返回 `{"status": "ok"|"degraded"|"down", "service": "orchestrator", "version": "…", "llm": "ok", "tts": "ok", "asr": "ok"}`。
- 网关返回 `{"status": "…", "service": "tts_gateway", "version": "…", "provider": "edge_tts"}`。网关的 `/api/health` 只检查本进程和配置，不实际调用外部 provider，要求 1 秒内返回。orchestrator 探测各网关（超时 1 秒）后汇总出 `tts`、`asr` 字段。
- D3 默认方案：HTTP。客户端断线后按 1、2、4、8、16、30 秒退避轮询 `/api/health`，恢复后自动可用。

#### WA-08 鉴权与网络边界

- 公网只开 VM-1 的 443；80 只用于 ACME 证书校验和跳转 https（C-09）。S3 内测可临时开 12393，NSG 来源限定为团队 IP。
- 客户端调用 `/api/chat`、`/api/asr`、`/api/characters` 时携带 `Authorization: Bearer <CLIENT_TOKEN>`。`/api/health` 和 `/api/audio/*` 免令牌，因为 `<audio>` 元素无法附带请求头；风险登记为“音频 ID 在已知原文时可被推算”。
- VM-1 调用 VM-2/3/4 时携带 `X-Internal-Token`；VM-2/3/4 防火墙只允许 VM-1 和 VM-4 的来源 IP。
- 内网服务的发布端口只绑定私网地址（compose 用 `${BIND_ADDR}:8082:8082`）。Docker 发布的端口会绕过 ufw，不能只靠 ufw 拦截；云防火墙（NSG）同时设置。
- CORS 允许 `http://127.0.0.1:5173`（开发）和打包后的 `null` / `file://` 来源（Electron 实际发送的 Origin 需验证）。CORS 也要覆盖 `GET /api/audio/*`：客户端用 `crossOrigin="anonymous"` 加载音频后才能接 `AnalyserNode` 做口型。实际安全控制靠令牌，不靠 CORS。
- 客户端令牌保存在设置里（MVP 用 localStorage，后续再评估 Electron `safeStorage`）。

#### WA-09 角色、Prompt、音色与 LLM 输出

- 角色 YAML（2 号维护，3 号校验）在 README §8 的基础上增加 `voice_id` 和 `fallback_reply`。
- `character_pack/voices/voices.yaml`（2 号维护，4 号读取）：`voice_id` → provider 音色、语速、按 emotion 微调。
- LLM 输出约定（写进 `emotion_rules.md`）：只输出 JSON `{"text": "…", "emotion": "…", "motion": "…"}`。3 号负责解析和修正。
- `model_dict.json`（1、2 号共同维护）在示例字段之外增加 `motionMap`：冻结 motion → Cubism motion group 与 index。
- 回复长度：`persona.md`/`speech_style.md` 要求单条回复不超过 120 字。超过 `TTS_MAX_TEXT_CHARS`（默认 300）时，orchestrator 不调用 TTS，返回 `audio_url = null` 和 `TTS_UNAVAILABLE`，文字不截断。
- `voices.yaml` 的字段以 2 号确认的版本为准（H-07）；其他线程计划里的格式只是提案。
- 枚举规范化：orchestrator 对 LLM 输出的 emotion/motion 先 `strip().lower()` 再查白名单，所以对外只出现小写规范值；客户端按大小写敏感校验即可。
- 角色 YAML 增加可选 `knowledge_files`（相对 `character_pack/`），orchestrator 拼进 system prompt，合计上限 8 KB。YAML 和 `model_dict.json` 里的路径一律相对路径，不以 `/` 或 `character_pack/` 开头（打包后走 `file://`）。

#### WA-10 环境变量名

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

#### WA-11 CI

每个线程维护自己的 workflow 文件，避免互相冲突：`.github/workflows/client.yml`（1 号，windows-latest，build + test）、`orchestrator.yml`（3 号，ubuntu，pytest + schema 校验）、`voice-ops.yml`（4 号，ubuntu，pytest + shellcheck）。`server/common/` 的 schema 和 fixtures 改动会同时触发 3 号、4 号的 workflow。

#### WA-12 超时预算

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

---

## 附录 C：v1 线程 A 计划节选（第 3 ~ 6、9 节）

- 来源：`docs/implementation/THREAD_A_IMPLEMENTATION_PLAN.md`。未收录的小节（如第 1、2、7、8、10 节）已被正文取代，需要时查源文件
- 已被取代的内容：任务标题中的工时和 10 月日期不再适用，排期见正文第 2 部分。

### 3. 文件变更清单

| 路径 | 新建/修改 | 任务 | 说明 |
| --- | --- | --- | --- |
| `arknights-desktop-pet-vtuber_thread-a1_organized/**` → 根目录 | 移动 | G-02 | `git mv`，映射见 §4 G-02 |
| `arknights-desktop-pet-vtuber_thread-a1_organized.zip` | 删除 | G-02 | 先提取 2 个 `.env.example` |
| `.env.example`、`client/.env.example` | 新建（从 zip 提取） | G-02、A1-05、A1-10 | 原只含 `VITE_MOCK_CHAT`，A1-10 加 `VITE_MOCK_ASR`；注释中的端口改 12393 |
| `.gitignore` | 新建 | G-02、A1-07 | `node_modules/`、`dist/`、`release/`、`.env`、Core、样例模型 |
| `.gitattributes`、`.editorconfig` | 新建 | G-03 | LF、UTF-8 |
| `.github/workflows/client.yml` | 新建 | G-08 | windows-latest：typecheck、build、test（WA-11） |
| `client/package.json` | 修改 | A1-01、A1-07、A1-11 | 脚本；`pixi.js`、`pixi-live2d-display` 精确版本；vite 移入 devDependencies |
| `client/package-lock.json` | 新建 | A1-01 | `npm ci` 需要 |
| `client/vitest.config.ts` | 新建 | A1-01 | `root: "."`，`environment: "node"` |
| `client/vite.config.ts` | 修改 | A1-11 | `base: "./"`（`file://` 下资源路径） |
| `client/src/main/index.ts` | 修改 | A1-01 | `window-all-closed` 去参数；单实例锁提前返回 |
| `client/src/main/window.ts` | 修改 | A1-02、A1-09、A1-10 | 关窗改隐藏；`autoplayPolicy`；麦克风权限处理 |
| `client/src/renderer/index.html` | 修改 | A1-07 | 在 bundle 前加载本机 Cubism Core，缺失时不报错 |
| `client/scripts/prune-unlicensed-assets.mjs` | 新建 | A1-11 | 打包前删除未登记素材和 Core |
| `client/src/renderer/types/character.ts` | 修改 | A1-03 | 冻结枚举 + normalize |
| `client/src/renderer/types/chat.ts` | 修改 | A1-04 | `text`、`session_id`、`character_id`、`error` |
| `client/src/renderer/api/parseChatResponse.ts` | 新建 | A1-04 | 响应校验与兼容 |
| `client/src/renderer/api/chatClient.ts` | 修改 | A1-04、A1-05 | 令牌头；错误对象；`globalThis.setTimeout` |
| `client/src/renderer/api/mockChatClient.ts` | 修改 | A1-04 | 冻结枚举、降级样例 |
| `client/src/renderer/api/healthClient.ts`、`connection/ConnectionMonitor.ts` | 新建 | A1-06 | 健康检查与退避 |
| `client/src/renderer/api/asrClient.ts`、`api/mockAsrClient.ts` | 新建 | A1-10 | `/api/asr` |
| `client/src/renderer/audio/wavEncoder.ts`、`audio/VoiceRecorder.ts` | 新建 | A1-10 | 16 kHz 单声道 WAV |
| `client/src/renderer/audio/AudioPlayer.ts` | 修改 | A1-09 | `crossOrigin`、AnalyserNode |
| `client/src/renderer/config/defaultConfig.ts`、`clientConfig.ts`、`session.ts`（新） | 修改/新建 | A1-05 | 端口、角色、令牌、会话 UUID、旧默认值迁移 |
| `client/src/renderer/live2d/*.ts`、`modelDict.ts`（新）、`live2dMapping.ts`（新） | 修改/新建 | A1-07~09 | 渲染、映射、口型 |
| `client/src/renderer/App.tsx`、`components/*.tsx` | 修改 | A1-04~10 | 接线；连接状态；麦克风按钮；设置项 |
| `client/scripts/sync-character-pack.mjs` | 新建 | A1-07 | 本机复制 `model_dict.json` 与本机模型到 `public/characters/` |
| `client/tests/*.test.ts`、`client/tests/fixtures/*.json` | 新建/修改 | 各 A1 任务 | 见 §5 |
| `docs/DESKTOP_PET_MODE.md`、`LIVE2D_IMPORT.md`、`API_CONTRACT_ALIGNMENT.md`、`INTEGRATION_GAP_REPORT.md`、`client/README.md` | 修改 | A1 各任务、AC-14/16 | 与实现同步；用户安装说明 |
| `character_pack/ENUM_PROPOSAL.md` | 新建 | A2-01 | H-01 |
| `character_pack/characters/arknights_fan_001.yaml`、`characters/README.md` | 新建/修改 | A2-02 | 角色配置 + 字段说明 |
| `character_pack/prompts/{persona,speech_style,emotion_rules,livestream_rules,copyright_boundary}.md` | 新建 | A2-03 | 5 个 Prompt |
| `character_pack/prompts/tests/dialogue_cases.md` | 新建 | A2-03 | 10 轮实测用例与结果 |
| `character_pack/live2d-models/README.md` | 修改 | A2-04 | 开发模型表情、动作对照表 |
| `character_pack/live2d-models/model_dict.json` | 新建 | A2-04 | 开发版，含 `motionMap` |
| `character_pack/voices/voices.yaml` | 新建 | H-07 | 与 4 号对齐 |
| `character_pack/ASSET_SOURCE_TABLE.md` | 新建 | A2-05 | 素材登记 |
| `docs/VOICE_POLICY.md`、`docs/LICENSE_NOTICE.md` | 新建/修改 | A2-06 | 合规 |
| `character_pack/knowledge/*.md` | 新建 | A2-07 | 原创概述 |
| `audit/thread_a1_audit.*`、`audit/thread_a2_audit.*`、`audit/evidence/thread_a*/` | 新建 | §9 | 审计 |

不修改：`docs/API_CONTRACT.md`（3 号维护）、`server/`、`deploy/`、`scripts/`。

### 4. 任务实施细节

#### G-02 嵌套目录迁移（1 号，3 h，依赖 G-01）

- 目标：仓库只有一套结构，历史可追溯，不丢文件。
- 步骤：
  1. 新建 `chore/flatten-thread-a1`；`git status` 确认干净。
  2. 从 zip 提取 2 个 `.env.example` 到 `.env.example`、`client/.env.example`（已确认只含 `VITE_MOCK_CHAT`，无密钥）。
  3. 按目录 `git mv`：`upstream/`、`character_pack/`、`deploy/`、`server/`、`scripts/`、`docs/*` → 根目录同名位置；`audit/*` → `audit/`；嵌套 `README.md` → `docs/archive/THREAD_A1_PACKAGE_README.md`；`ORGANIZATION_REPORT.md` → `audit/ORGANIZATION_REPORT.md`（根 `README.md` 不覆盖）。
  4. 删除已有内容目录下的 `.gitkeep`；`git rm` zip；新建根 `.gitignore`（§4 A1-07 给出条目）。
  5. `git grep -n "thread-a1_organized"`，修正文档中的旧路径。
- 验证：

```bash
git ls-files | grep -c "thread-a1_organized"   # 期望 0
git log --follow --oneline -- upstream/Open-LLM-VTuber/client/src/main/index.ts
node -e "const m=require('./audit/source_manifest.json'),c=require('crypto'),{execSync}=require('child_process');let ok=0;for(const f of m.files){const b=execSync('git show HEAD:'+f.destination);if(c.createHash('sha256').update(b).digest('hex')===f.destination_sha256)ok++}console.log(ok+'/'+m.files.length)"
```

- 完成标准：嵌套目录和 zip 不存在；manifest 33/33（仅对迁移提交有效，后续改源码后哈希变化属预期）。

#### G-03 换行与编码（1 号，1 h，依赖 G-02）

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.moc3 binary
*.mp3 binary
*.wav binary
*.zip binary
*.ico binary
*.bat text eol=crlf
*.cmd text eol=crlf
```

- `.editorconfig`：`root=true`；`charset=utf-8`、`end_of_line=lf`、`insert_final_newline=true`；TS/JSON/YAML/MD 缩进 2，Python 4。
- 执行 `git add --renormalize .` 后提交。现有工作区不做 `reset --hard`；验证用全新克隆：`git clone -b <branch> <url> temp/verify` 后跑上面的 manifest 脚本（读工作区文件版本）期望 33/33，完成后删除 `temp/verify`。

#### G-08 客户端 CI（1 号，2 h，依赖 G-02、A1-01）

```yaml
name: client
on:
  pull_request:
    paths: ["upstream/Open-LLM-VTuber/client/**", "server/common/fixtures/**", ".github/workflows/client.yml"]
jobs:
  build-test:
    runs-on: windows-latest
    defaults: { run: { working-directory: upstream/Open-LLM-VTuber/client } }
    env: { ELECTRON_SKIP_BINARY_DOWNLOAD: "1" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm, cache-dependency-path: upstream/Open-LLM-VTuber/client/package-lock.json }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

- 需验证：Electron 34 是否仍识别 `ELECTRON_SKIP_BINARY_DOWNLOAD`；本机实测用的是 Node 25.9.0，CI 固定 Node 22 LTS 后需重跑一次。
- 完成标准：PR 上 check 为绿；fixtures 变更也会触发（合同测试）。

#### A1-01 修构建（1 号，2.5 h，依赖无）

1. `src/main/index.ts`：

```ts
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("ready", () => { /* 原逻辑 */ });
}
// 订阅即阻止默认退出；退出只走托盘“退出”
app.on("window-all-closed", () => {});
```

2. 新建 `vitest.config.ts`（vitest 优先读取它，不再继承 vite 的 `root`）：

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { root: ".", include: ["tests/**/*.test.ts"], environment: "node" } });
```

3. `package.json` 脚本：

```json
"build:main": "tsc -p tsconfig.main.json",
"typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.main.json --noEmit",
"dev": "npm run build:main && concurrently -k \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
"build": "npm run build:main && vite build",
"test": "vitest run"
```

4. 生成并提交 `package-lock.json`（当前不存在，`npm ci` 需要）。
- 验证：`npm run typecheck`、`npm run build`、`npm test`（期望 3 文件 6 用例通过）；全新克隆 `npm ci && npm run dev` 弹出窗口（手工）。
- 完成标准：三条命令退出码 0；窗口截图。

#### A1-02 实测桌宠窗口（1 号 0.5 h + 2 号 1 h 截图，依赖 A1-01）

- 代码审阅发现：`window.ts` 未拦截 `close`，Alt+F4 会销毁窗口，托盘菜单随后操作已销毁对象。修法：

```ts
let quitting = false;
app.on("before-quit", () => { quitting = true; });
window.on("close", (e) => { if (!quitting) { e.preventDefault(); window.hide(); } });
```

- `styles.css` 中 `.pet-stage` 整块是 `drag-region`，会吞掉 Live2D 画布的点击（tapMotions）。决定：拖动手柄改为 topbar，舞台 `no-drag`；写入 `docs/DESKTOP_PET_MODE.md`。
- 需验证：Windows 上 `transparent: true` 与 `resizable: true` 同时开启的表现。
- 检查清单：透明背景、置顶、拖动、托盘显示/隐藏/退出、Alt+F4 后托盘仍可恢复、第二实例聚焦已有窗口。每项截图存 `audit/evidence/thread_a1/`。

#### A1-03 枚举白名单与回退（1 号，2 h，依赖 D2；按 WA-04 先做）

`types/character.ts` 改为冻结枚举，合同枚举与客户端内部状态分开：

```ts
export const EMOTIONS = Object.freeze(["neutral","smile","serious","worried","sad","surprised","thinking","confident"] as const);
export const MOTIONS = Object.freeze(["idle","greeting","nod","shake","think","encourage","battle_ready"] as const);
export type Emotion = (typeof EMOTIONS)[number];
export type Motion = (typeof MOTIONS)[number];
const EMOTION_SET: ReadonlySet<string> = new Set(EMOTIONS);
export function normalizeEmotion(v: unknown): Emotion {
  return typeof v === "string" && EMOTION_SET.has(v) ? (v as Emotion) : "neutral";
}
// normalizeMotion 同理，回退 "idle"
export type CharacterState = "idle" | "thinking" | "speaking" | "error"; // 仅客户端内部
```

- 大小写敏感、不 trim。B 侧对 LLM 输出先 `strip().lower()` 再出口校验（WA-09），客户端收到的都是规范值。旧类型 `CharacterExpression`、`CharacterMotion` 删除，引用改为 `Emotion`、`Motion`。
- `CharacterStateMachine`：删除 `emotionToState`；`userMessageSent` → `thinking/thinking/think`；`requestFailed` → `state=error, expression=worried, motion=idle`；`speakingStarted` 不再写 `motion: "speak"`；无音频回复时 `state=speaking` 直到定时回 idle。
- 测试：`tests/enums.test.ts`（8 个合法值原样返回、未知值、`""`、`null`、`undefined`、数字、`"Smile"`、数组不可修改）；改 `tests/stateMachine.test.ts` 为新枚举。

#### A1-04 合同对齐（1 号，4 h，依赖 D2；按 WA-03/05 先做）

`types/chat.ts`：

```ts
export interface ChatRequest {
  session_id: string; character_id: string; input_type: "text" | "voice"; text: string;
  enable_tts: boolean; client_state?: { current_motion: Motion; language: string };
}
export interface ApiError { code: string; message: string }
export interface ChatResponse {
  session_id: string; character_id: string; text: string; emotion: Emotion; motion: Motion;
  audio_url: string | null; duration_ms: number | null; error: ApiError | null;
}
```

`api/parseChatResponse.ts`：`parseChatResponse(raw: unknown, req: ChatRequest): ChatResponse`

- `text = raw.text ?? raw.reply_text`（`reply_text` 只在过渡期保留，D2 后删）；两者都不是字符串 → 抛 `ChatClientError("BAD_RESPONSE")`。
- `session_id`、`character_id` 存在且与请求不同 → 抛错；缺失 → 用请求值并 `console.warn`（过渡期）。
- `emotion`、`motion` 经 normalize；`audio_url` 非字符串 → `null`；`duration_ms` 非数字 → `null`。
- `error` 只接受 `{code: string, message: string}` 或 `null`；其他形状 → `null`。未知字段忽略。

`api/chatClient.ts`：令牌非空时加 `Authorization: Bearer <token>`；非 2xx 解析 `{"error":{code,message}}`，抛 `ChatClientError(code, status)`；`window.setTimeout` 改 `globalThis.setTimeout`（可在 node 环境测试）。

| code | 客户端行为 |
| --- | --- |
| `null` | 正常显示 |
| `TTS_UNAVAILABLE` | 只显示字幕，不显示错误（AC-09） |
| `LLM_UNAVAILABLE` / `LLM_BAD_OUTPUT` | 正常显示兜底文本，字幕下方小字“回复为兜底内容” |
| `UNAUTHORIZED` | “令牌无效，请在设置中检查”，打开设置 |
| `CHARACTER_NOT_FOUND` | “角色不存在：<id>” |
| `RATE_LIMITED` / `OVERLOADED` | “服务繁忙，请稍后重试”，显示重试按钮 |
| 其他 / `INTERNAL` | 显示 `message` |
| 内部 `NETWORK` / `TIMEOUT` | 通知 `ConnectionMonitor.reportFailure()`（A1-06） |

- Mock：8 条回复覆盖 8 个 emotion 和 7 个 motion；另含 1 条 `TTS_UNAVAILABLE`、1 条未知枚举（演示回退）；Mock 输出也经 `parseChatResponse`。
- `App.tsx`：读 `response.text`；`audioBase64` 只作为播放器能力保留，不进合同类型。
- 测试：`tests/parseChatResponse.test.ts`、`tests/chatClient.test.ts`、`tests/mockChatClient.test.ts`、`tests/contract.test.ts`（§5）。

#### A1-05 会话、默认值、令牌（1 号，2 h，依赖 D2、D8；按 WA-01/08 先做）

- 新建 `config/session.ts`：`getOrCreateSessionId()`，键 `arknights-vtuber-pet.session.v1`，首次 `crypto.randomUUID()`；与设置分开存，“恢复默认设置”不换会话。
- `defaultConfig.ts`：`backendBaseUrl: "http://127.0.0.1:12393"`、`characterId: "arknights_fan_001"`、新增 `clientToken: ""`、`modelName: "arknights_fan_model"`、`modelPath` 改为 `modelPathOverride: ""`（A1-07）。`requestTimeoutMs` 由 15000 改为 30000（WA-12）。
- `clientConfig.ts`：`migrateLegacyDefaults()`：已保存值等于旧默认 `http://127.0.0.1:8000` 或 `operator_default` 时替换为新默认；用户自定义值不动。
- `SettingsPanel`：新增“访问令牌”（`type="password"`、`autoComplete="off"`）和“角色 ID”。令牌不写日志、不进审计。
- 风险登记：令牌存 localStorage，本机同用户可读（WA-08 已接受，MVP）。
- 测试：`tests/session.test.ts`（首次生成、二次复用、UUID 格式）；`tests/config.test.ts` 加默认值、旧值迁移、自定义值保留。

#### A1-06 连接状态与自动重连（1 号，3 h，依赖 D3、H-10 联调）

- `api/healthClient.ts`：`GET {base}/api/health`，不带令牌，超时 3 s；`ok`/`degraded` → 可用（`degraded` 显示“语音服务降级”），`down`、非 200、超时 → 不可用。
- `connection/ConnectionMonitor.ts`：

```ts
type ConnStatus = "online" | "degraded" | "offline" | "checking";
const BACKOFF_S = [1, 2, 4, 8, 16, 30]; // WA-07，之后保持 30
class ConnectionMonitor {
  constructor(check: () => Promise<"ok" | "degraded" | "down">, timers = globalThis) {}
  start(): void; stop(): void; reportFailure(): void; checkNow(): void;
  onChange(cb: (s: ConnStatus) => void): () => void;
}
```

- 启动时检查一次；在线时每 30 s 检查一次（不发消息也能发现断线）；断线后按退避轮询，间隔按“开始到开始”计。恢复后状态 `online`，发送按钮恢复。
- UI：topbar 徽标“在线/降级/断线（重试中）/Mock”，`aria-live="polite"`；断线时发送按钮禁用并显示“立即重试”。Mock 模式停止监控。
- 验证：fake timers 单测；手工：停 orchestrator → 30 s 内显示断线 → 重启 → 自动恢复，记录时间戳。

#### A1-07 Live2D 渲染（1 号，6 h，依赖 A1-01、H-06；W2 先做 1.5 h 兼容性试验）

| 方案 | 优点 | 风险 |
| --- | --- | --- |
| `pixi-live2d-display`（guansss）+ `pixi.js` | 高层 API（`Live2DModel.from`、`motion()`、`expression()`），支持 Cubism 2.1/3/4 模型；新版本已迁移到 Pixi v7（来自 release 说明） | 上游维护不活跃；Cubism 5 模型兼容性未验证；需要与 peer 依赖的 pixi.js 主版本严格匹配 |
| 社区分支（如 `pixi-live2d-display-advanced`，Pixi v8 另有独立引擎） | 维护较新 | 来源分散，API 可能与原版不同，需逐项验证 |
| 官方 Cubism SDK for Web | 官方支持，跟进 Cubism 5 | 渲染循环、模型加载、动作管理都要自己写，估计多 15 h |

推荐：先用 `pixi-live2d-display` 的 Cubism 4 路线。W2 试验在 Electron 34 + Vite 6 上加载官方样例模型，通过后按 `npm view pixi-live2d-display peerDependencies` 的结果锁定 `pixi.js` 精确版本。试验失败时改用社区分支；分支也失败时再评估官方 SDK，并在周报中说明 AC-03/07/08 顺延。

Cubism Core 处理：

- 各开发者在 Live2D 官网接受许可后下载 `live2dcubismcore.min.js`，放到 `client/public/vendor/`（`.gitignore` 排除）。仓库不提交 Core，也不提交样例模型。
- `index.html` 在 bundle 前用普通 `<script src="./vendor/live2dcubismcore.min.js">` 加载。文件缺失时 `Live2DRenderer` 检测 `window.Live2DCubismCore` 不存在，回退到现有 CSS 占位角色并显示“未安装 Cubism Core”。
- 能否随安装包分发 Core，取决于 SDK 发布许可（个人或小规模事业者的条件需由 2 号核对官网条款，未验证）。登记完成前，安装包不含 Core（A1-11 的 prune 脚本负责）。

模型文件：

- `scripts/sync-character-pack.mjs`：把 `character_pack/live2d-models/model_dict.json` 和本机模型目录（`ARKNIGHTS_LOCAL_MODELS`，默认 `../local-models`，仓库外）复制到 `public/characters/`。`public/characters/*` 除 `placeholder_operator/` 外都进 `.gitignore`。
- `live2d/modelDict.ts`：

```ts
export interface ModelEntry {
  modelPath: string;                 // 相对路径，如 "characters/dev_model/dev_model.model3.json"（WA-09）
  scale: number;
  initialPosition: { anchor: "bottom-right" | "bottom-left"; offsetX: number; offsetY: number };
  defaultExpression: string;
  emotionMap: Partial<Record<Emotion, string>>;                     // emotion → model3.json 里的表情名
  motionMap: Partial<Record<Motion, { group: string; index: number }>>;
  tapMotions: Motion[];
}
export async function loadModelDict(url = "./characters/model_dict.json"): Promise<Record<string, ModelEntry>>;
export function pickModel(dict: Record<string, ModelEntry>, name: string, override?: string): ModelEntry | null;
```

- `Live2DRenderer` 改为持有 PIXI `Application`（透明背景 `backgroundAlpha: 0`），`load()` 调 `Live2DModel.from(entry.modelPath)`，按 `scale` 和 `initialPosition` 定位；窗口尺寸变化时重新定位。
- `vite.config.ts` 设 `base: "./"`（A1-11 一并验证 `file://` 下资源路径）。
- 验证：`tests/modelDict.test.ts`；手工：样例模型显示，改 `scale` 生效，截图。完成标准：模型可见、透明背景无黑框；缺 Core 或缺模型时回退占位角色并提示。

#### A1-08 表情与动作映射（1 号，4 h，依赖 A1-07、H-06）

- 新建 `live2d/live2dMapping.ts`：

```ts
export function resolveExpression(entry: ModelEntry, e: Emotion): string {
  return entry.emotionMap[e] ?? entry.emotionMap.neutral ?? entry.defaultExpression;
}
export function resolveMotion(entry: ModelEntry, m: Motion): { group: string; index: number } | null {
  return entry.motionMap[m] ?? entry.motionMap.idle ?? null;
}
export function validateEntry(entry: ModelEntry, model3: unknown): string[]; // 返回缺失项列表，加载时 console.warn
```

- `ExpressionController.apply(e)` 调 `model.expression(resolveExpression(...))`；`MotionController.play(m)` 调 `model.motion(group, index, priority)`。`idle` 用低优先级，回复动作用普通优先级打断 idle（优先级常量名需按所选库验证）。
- `tapMotions`：点击模型命中区域时随机播放其中一个。A1-02 已把舞台改成 `no-drag`，点击才能到达画布。
- 开发版加调试面板（`import.meta.env.DEV` 才显示）：8 个表情、7 个动作按钮，用于录屏取证。
- 验证：`tests/live2dMapping.test.ts`；手工：逐个触发 8 个表情、7 个动作并录屏（2 号协助）。完成标准：15 段录屏都有记录（§9 证据规则）；映射缺失时回退，不抛错。

#### A1-09 口型（1 号，3 h，依赖 A1-07）

- `AudioPlayer`：`audio.crossOrigin = "anonymous"`（需要 `/api/audio/*` 返回 CORS 头，WA-08）；首次播放时创建 `AudioContext`、`MediaElementAudioSourceNode` 和 `AnalyserNode`（`fftSize = 1024`），每个 `Audio` 元素只创建一次 source。
- `LipSyncController`：去掉随机数，改为每帧读 `getFloatTimeDomainData` 求 RMS；`level = clamp((rms - 0.02) * 6, 0, 1)`，上升平滑 0.5、下降平滑 0.2（参数需实测调整）。在模型更新之后写 `ParamMouthOpenY`，避免被动作覆盖。
- 回退：播放中连续 1 秒 RMS 恒为 0（跨域音频被静音）时，切回随机口型并 `console.warn` 一次。
- `window.ts`：`webPreferences.autoplayPolicy = "no-user-gesture-required"`（需验证 Electron 34 仍支持），否则首次自动播放会被拦截。
- `audio_url` 为相对路径时，以 `backendBaseUrl` 为基准解析。
- AC-09：`onError` 不再显示错误，只 `console.warn`；状态在字幕显示后按定时回到 idle。
- 验证：`tests/lipSync.test.ts`（RMS → level 映射、平滑、阈值）；手工：有声嘴动、静音闭合、停 TTS 后无错误提示。

#### A1-10 语音输入（1 号，5 h，依赖 D5、H-11 联调；按 WA-06 先做）

- `audio/VoiceRecorder.ts`：`getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` + `MediaRecorder`；按一次开始、再按一次结束，`Esc` 取消；显示计时，30 秒自动停止；短于 0.5 秒丢弃。
- 转换：录音 Blob → `decodeAudioData` → `OfflineAudioContext(1, ceil(duration × 16000), 16000)` 重采样 → `audio/wavEncoder.ts` 的 `encodeWav16(samples: Float32Array, sampleRate = 16000): ArrayBuffer`（PCM 16 bit、单声道、44 字节头）。结果超过 1 MB 时截断到 30 秒。
- `api/asrClient.ts`：

```ts
export async function transcribe(wav: ArrayBuffer, opts: { baseUrl: string; token: string; language?: string }):
  Promise<{ text: string; provider: string; confidence: number | null }>;
```

  - `multipart/form-data`：`file`（`audio.wav`，`audio/wav`）+ `language`（默认 `zh-CN`），带令牌，超时 20 s（WA-12）。
  - 200 且 `text` 非空 → 以 `input_type: "voice"` 调 `/api/chat`；200 + `ASR_EMPTY` → “没有听清，请再说一次”；503 `ASR_UNAVAILABLE`、网络错误、超时 → “语音服务不可用，已切换到文字输入”，聚焦输入框，麦克风按钮禁用 60 s；400 → 显示 `message`；401 → 同 A1-04。
- `api/mockAsrClient.ts`：`VITE_MOCK_ASR=true` 时 300 ms 后返回固定文本。
- 麦克风权限：`session.setPermissionRequestHandler` 只允许本应用页面的 `media` 请求，其他一律拒绝。`file://` 与 `http://127.0.0.1` 应视为安全上下文（需验证）。拒绝权限时提示并切换到文本输入。
- 验证：`tests/wavEncoder.test.ts`、`tests/asrClient.test.ts`；手工：正常识别一次；停 asr_gateway 后提示并聚焦输入框（AC-10）。导出一段客户端生成的 WAV 给 4 号，作为 asr_gateway 的格式样例。

#### A1-11 Windows 打包（1 号，4 h + 2 号 2 h 干净机器验证，依赖 A1-01）

- `package.json`：`vite`、`@vitejs/plugin-react` 移到 `devDependencies`（renderer 已打包，运行时不需要）；`"package": "npm run build && node scripts/prune-unlicensed-assets.mjs && electron-builder --win nsis"`。
- `prune-unlicensed-assets.mjs`：删除 `dist/renderer/characters/` 下除 `placeholder_operator/` 以外的内容，删除 `dist/renderer/vendor/live2dcubismcore*`；只有在 `ASSET_SOURCE_TABLE.md` 登记 Core 可分发之后，才允许用 `ALLOW_CUBISM_CORE=1` 保留。删除后列出剩余文件，供审计。
- 没有代码签名，安装时 SmartScreen 会警告，`DESKTOP_PET_MODE.md` 写明处理步骤。
- `docs/DESKTOP_PET_MODE.md` 用户部分（2 号起草初稿）：安装、首次运行、填后端地址和令牌、麦克风权限、托盘、放置本机 Core 与模型、卸载。
- 验证：在 Windows Sandbox 或干净 VM 上安装、启动、对话、卸载，并截图；`npx asar list` 确认安装包内无 Core 和样例模型。完成标准：非作者（2 号）按文档完成一次对话（AC-16 客户端部分）。

#### A2-01 枚举提案（2 号，2 h，依赖无，H-01 10-12）

`character_pack/ENUM_PROPOSAL.md`：两张表（emotion 8 行、motion 7 行），列为“值 | 含义 | 典型触发场景 | 示例台词 | 模型缺资源时的近似”。示例：`worried` | 担心 | 用户说累、受挫 | “博士，先休息一下吧。” | 近似 `sad`。PR 中请 1、3 号确认，确认后作为 D2 输入，值与 WA-04 一致，不新增。

#### A2-02 角色 YAML（2 号，3 h，依赖 A2-01，H-05 10-19）

`character_pack/characters/arknights_fan_001.yaml`（路径相对 `character_pack/`，WA-09）：

```yaml
character_id: arknights_fan_001        # 必须与文件名一致
character_name: Rhodes Fan Operator
display_name: 罗德岛风格同人桌宠
human_name: 博士
live2d_model_name: arknights_fan_model # model_dict.json 的键
voice_id: arknights_fan_default        # voices.yaml 的键
fallback_reply: 博士，通讯似乎有些不稳定。不过我还在这里。
prompt_files:
  - prompts/persona.md
  - prompts/speech_style.md
  - prompts/emotion_rules.md
  - prompts/livestream_rules.md
  - prompts/copyright_boundary.md
knowledge_files:                       # 可选，合计 ≤ 8 KB
  - knowledge/rhodes_island_overview.md
default_emotion: neutral
default_motion: idle
allowed_emotions: [neutral, smile, serious, worried, sad, surprised, thinking, confident]
allowed_motions: [idle, greeting, nod, shake, think, encourage, battle_ready]
```

`characters/README.md` 写字段表（字段 | 必填 | 类型 | 说明 | 校验规则）。README §8 示例里的 `avatar` 暂不使用（没有对应目录），不写入。验证：B-04 loader 在真实角色包上通过（3 号执行）。

#### A2-03 Prompt（2 号，6 h，依赖 A2-01，H-05 10-19）

| 文件 | 要点 |
| --- | --- |
| `persona.md` | 原创干员：背景、职责、性格三条；称呼用户“博士”；不自称任何官方角色，不使用官方角色名 |
| `speech_style.md` | 中文口语；单条回复 ≤ 120 字、1~3 句（WA-09）；不用 emoji、Markdown、列表（会被 TTS 念出来） |
| `emotion_rules.md` | 只输出一行 JSON `{"text":"…","emotion":"…","motion":"…"}`，不加解释、不加代码块；只用冻结枚举；拿不准时 `neutral` / `idle`；附 3 组示例 |
| `livestream_rules.md` | 不讨论政治、色情、暴力细节；拒绝索取个人信息；遇到越界请求礼貌转移话题，仍按 JSON 输出 |
| `copyright_boundary.md` | 不复述官方剧情原文、台词、角色设定细节；被要求时说明这是同人项目并概括说明 |

`prompts/tests/dialogue_cases.md`：10 条用例（问候、疲惫、夸奖、问天气、问游戏剧情、要求扮演官方角色、索取个人信息、超长提问、英文提问、要求用 Markdown 回复）。O-01 到位后与 3 号实测，记录每轮 JSON 是否合法、枚举是否合法、字数。完成标准：至少 9/10 轮 JSON 和枚举都合法，失败轮次写明原因并改 Prompt。O-01 未到位前用 mock LLM 只检查 Prompt 拼接格式。

#### A2-04 `model_dict.json` 开发版（2 号 3 h + 1 号 1 h，依赖 A2-01、D6，H-06 10-19）

- 开发模型：Live2D 官方免费样例中选一个（具体模型名与《免费素材许可》适用范围由 2 号在 A2-05 核对，未验证）。各人本机放到 `local-models/dev_model/`，键名固定为 `arknights_fan_model`，这样换正式模型时只改 `modelPath` 和映射。
- `character_pack/live2d-models/model_dict.json`：

```json
{
  "arknights_fan_model": {
    "modelPath": "characters/dev_model/dev_model.model3.json",
    "scale": 1.0,
    "initialPosition": { "anchor": "bottom-right", "offsetX": -28, "offsetY": -28 },
    "defaultExpression": "<样例模型的默认表情名>",
    "emotionMap": { "neutral": "<名>", "smile": "<名>", "worried": "<名>" },
    "motionMap": { "idle": { "group": "Idle", "index": 0 }, "greeting": { "group": "TapBody", "index": 0 } },
    "tapMotions": ["greeting", "nod"]
  }
}
```

- `<名>` 和 group 名按样例模型的 `model3.json` 实际内容填写；8 个 emotion、7 个 motion 都要有条目。样例资源不够时允许多个值映射到同一个资源，并在 `live2d-models/README.md` 的对照表中标“近似”。
- 验证：1 号用 A1-08 调试面板逐项触发；`validateEntry` 无缺失警告。

#### H-07 `voices.yaml`（2 号，1 h，10-19）

格式采用 4 号在 C 计划 §4.2 的提案（`version`、`default_voice_id`、`voices.<id>.provider_voices`、`rate`、`pitch`、`emotion` 微调），2 号确认后定稿（WA-09）。`voice_id` 与角色 YAML 一致。音色名先写 `zh-CN-XiaoyiNeural`，以 4 号 `edge-tts --list-voices` 的实际输出为准。只用 provider 的通用音色，不模仿官方配音演员（VOICE_POLICY）。验证：4 号的 tts_gateway 以此文件启动，每个 `voice_id` 合成 1 句。

#### A2-05 素材来源登记（2 号，3 h，依赖无，W0 开始）

`character_pack/ASSET_SOURCE_TABLE.md` 表头：

| ID | 类型 | 名称 | 作者/权利方 | 来源链接 | 许可与关键条款 | 用途 | 进仓库 | 进安装包 | 状态 | 核对人/日期 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

首批登记：Live2D Cubism Core（Live2D Proprietary Software License；能否随安装包分发待核对）、开发样例模型（Free Material License；可用范围待核对）、Open-LLM-VTuber（MIT）、Live2D 渲染库（MIT，以实际选用包为准）、Edge TTS 音色（服务条款待核对）、CSS 占位角色（原创）。“状态”取值：`approved`、`dev_only`、`pending`、`rejected`。完成标准：每行都填齐，没有空格子；有一项 `pending` 就不能进安装包。

#### A2-06 合规文档（2 号，3 h，依赖 D9）

- `docs/VOICE_POLICY.md`：只用通用合成音色，不克隆、不模仿官方配音；不提交任何官方音频；语音输入会发送到第三方云 ASR，不落盘（C-04）；TTS 缓存 72 h 自动清理；更换音色要先登记。
- `docs/LICENSE_NOTICE.md`：代码 MIT（D9 默认）；上游 Open-LLM-VTuber 的 MIT 版权声明原文；Live2D Core、Framework 和样例模型各自适用 Live2D 的许可，不属于 MIT；本项目为同人作品，与鹰角网络无关，“明日方舟”等商标归权利方所有；不包含官方素材。D9 结论不同时改第一条。

#### A2-07 知识文件（2 号，3 h，依赖 A2-02）

`character_pack/knowledge/`：`rhodes_island_overview.md`（自行概述公开常识，≤ 1500 字）、`glossary.md`（术语 ≤ 30 条，每条 ≤ 50 字）。全部用自己的话写，不复制官方剧情、台词、档案原文；每个文件开头注明“同人概述，非官方资料”。合计 ≤ 8 KB（WA-09）。验证：1 号抽查 5 条；B-04 加载后 system prompt 长度在上限内。

### 5. 测试计划

#### 5.1 单元测试（vitest，`client/tests/`）

| 文件 | 要点 |
| --- | --- |
| `enums.test.ts` | 8/7 个合法值原样返回；未知值、空串、`null`、数字、`"Smile"` 回退；数组冻结 |
| `stateMachine.test.ts`（改） | 新枚举；`requestFailed` → `worried`/`idle`；无音频回复定时回 idle |
| `parseChatResponse.test.ts` | `text` 优先、`reply_text` 兼容；两者都缺抛错；id 不一致抛错；未知字段忽略；`error` 形状校验 |
| `chatClient.test.ts` | 令牌头有/无；非 2xx 错误体映射；超时（fake timers）；网络错误通知 `ConnectionMonitor` |
| `mockChatClient.test.ts`（改） | 覆盖 8 个 emotion、7 个 motion；含降级样例 |
| `contract.test.ts` | 读 fixtures：请求构造与 `chat_request.json` 深度相等；每个响应 fixture 经 `parseChatResponse` 不抛错；不引入 schema 校验库 |
| `session.test.ts`、`config.test.ts`（改） | UUID 生成与复用；新默认值；旧默认值迁移；自定义值保留 |
| `connectionMonitor.test.ts`、`healthClient.test.ts` | 退避序列 1/2/4/8/16/30；恢复后 online；`degraded` 判定 |
| `modelDict.test.ts`、`live2dMapping.test.ts` | 解析、相对路径；缺 emotion/motion 回退；`validateEntry` 报缺失 |
| `lipSync.test.ts` | RMS → level；平滑；静音判定 |
| `wavEncoder.test.ts` | RIFF 头字段；16 kHz/单声道/16 bit；样本裁剪到 [-1, 1]；长度 |
| `asrClient.test.ts` | multipart 字段；200、`ASR_EMPTY`、503、401、超时 |
| `pruneAssets.test.ts` | 临时目录中只保留占位角色；无 `ALLOW_CUBISM_CORE` 时删除 Core |

fixtures：H-04 前放 `client/tests/fixtures/`，H-04 后改读 `server/common/fixtures/`（3 号维护），本地副本删除。重采样依赖浏览器 API，只做手工测试。

#### 5.2 手工测试（证据存 `audit/evidence/thread_a1/`、`thread_a2/`）

| ID | 场景 | 证据 |
| --- | --- | --- |
| M-01 | 窗口透明、置顶、拖动、托盘、Alt+F4、第二实例 | 截图 6 张 |
| M-02 | 8 个表情、7 个动作 | 录屏 15 段 |
| M-03 | 口型有声/静音 | 录屏 1 段 |
| M-04 | 停 TTS：只显示字幕、无错误 | 截图 |
| M-05 | 录音识别；停 ASR 切文本 | 截图 + 时间戳 |
| M-06 | 停后端 → 断线 → 重启 → 自动恢复 | 时间戳记录 |
| M-07 | 干净 Windows 安装、对话、卸载 | 截图 + 安装包内容清单 |
| M-08 | Prompt 10 轮实测 | `dialogue_cases.md` 结果表 |

### 6. 对外交付与 Mock

| ID | 内容 | 提供 | 截止 | 验收方式 |
| --- | --- | --- | --- | --- |
| H-01 | `ENUM_PROPOSAL.md` | 2 号 | 10-12 | 1、3 号在 PR 中确认 |
| H-05 | 角色 YAML + 5 个 Prompt | 2 号 | 10-19 | B-04 loader 在真实角色包上测试通过 |
| H-06 | 开发模型说明 + `model_dict.json` | 2 号 | 10-19 | A1-07 加载成功，`validateEntry` 无缺失 |
| H-07 | `voices.yaml` | 2 号 | 10-19 | tts_gateway 以此启动，每个 `voice_id` 合成 1 句 |
| — | 客户端 Mock 模式 | 1 号 | W2 | `VITE_MOCK_CHAT=true VITE_MOCK_ASR=true npm run dev` 可完整演示 |
| — | 客户端生成的 WAV 样例 | 1 号 | W4 | 4 号的 asr_gateway 校验通过 |

本线程接收：H-04（10-15）、H-10（10-20）、H-11（10-23）、B-09 + C-09 的 https 地址（S4）。到期未到时按 §2 继续用 Mock，并在周报中标为阻塞。

### 9. 审计输出

- 文件：`audit/thread_a1_audit.{md,json}`（1 号）、`audit/thread_a2_audit.{md,json}`（2 号），格式沿用工作报告 v2，两份结论必须一致。
- JSON 字段：`report_format`、`thread`（`a1`/`a2`）、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。
- 证据规则：截图（PNG，≤ 500 KB）进 `audit/evidence/thread_a*/`；录屏含样例模型，不进仓库，存团队网盘，审计里记文件名、sha256、时长和存放位置；命令输出附退出码和摘要。
- A2 额外检查：`ASSET_SOURCE_TABLE.md` 无空格子；`dialogue_cases.md` 结果表；`git ls-files | grep -Ei '\.moc3$|\.motion3\.json$|\.exp3\.json$|live2dcubismcore'` 期望无输出。
- 敏感信息：`git grep -nIE '(api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}' -- ':!*.example' ':!*.md'` 期望无命中；有命中逐条人工复核。

---

## 附录 D：v1 线程 B 计划节选（第 3 ~ 6、9 节）

- 来源：`docs/implementation/THREAD_B_IMPLEMENTATION_PLAN.md`。未收录的小节（如第 1、2、7、8、10 节）已被正文取代，需要时查源文件
- 已被取代的内容：任务标题中的工时和 10 月日期不再适用，排期见正文第 3 部分；节点名按正文改为 `primary`/`fallback`。

### 3. 文件变更清单

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

### 4. 任务实施细节

#### B-01 上游调研（3 h，依赖无，H-03 10-12）

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

#### B-02 合同 v1.0（6 h，依赖 H-01、H-02、B-01，H-04 10-15）

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

#### B-03 orchestrator 骨架（8 h：骨架 3 h 在 D2 前，业务 5 h 在 D2 后；H-10 10-20）

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

#### B-04 角色包加载（4 h，依赖 H-05；W2 先用测试样例）

`characters.py`：启动时读 `CHARACTER_PACK_DIR/characters/*.yaml`，用 pydantic 模型校验，错误全部收集后一起抛出 `CharacterPackError`，拒绝启动。

- 必填：`character_id`（与文件名一致）、`display_name`、`human_name`、`live2d_model_name`、`voice_id`、`fallback_reply`、`prompt_files`（非空）、`default_emotion`、`default_motion`、`allowed_emotions`、`allowed_motions`。可选：`character_name`、`knowledge_files`。
- `allowed_*` 必须是冻结枚举的子集；`default_*` 必须在 `allowed_*` 中。
- 路径相对 `character_pack/`（WA-09）：`resolve()` 后必须仍在角色包目录内（防路径穿越）；文件必须存在；`knowledge_files` 合计 ≤ 8 KB。
- MVP 不支持热加载，改角色包后重启容器。

`prompting.py`：system prompt = 按顺序拼接 `prompt_files` → `## 参考资料` + `knowledge_files` → 系统生成的一段“可用 emotion：…；可用 motion：…”（从 YAML 读取，枚举只有一个来源）。输出格式说明以 `emotion_rules.md` 为准，B 不重复写。

验证：`test_characters.py`（合法包；缺字段；非法枚举；id 与文件名不一致；`../` 路径；文件缺失；知识文件超限）；`test_real_pack.py`（真实角色包存在时校验，不存在时跳过）。

#### B-05 LLM 适配与输出解析（6 h，依赖 B-03；实测依赖 O-01）

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

#### B-06 TTS 调用、主备切换、音频代理（6 h，依赖 B-03、H-02、H-08）

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

#### B-07 会话管理（3 h，依赖 B-03）

`sessions.py`：`SessionStore(max_sessions=SESSION_MAX, ttl_s=SESSION_TTL_S, max_turns=8)`

- 键 `(session_id, character_id)`；值为最多 16 条消息的 `deque`、`last_seen`、`asyncio.Lock`。
- `OrderedDict` 实现 LRU：访问时移到末尾，超过 `SESSION_MAX`（默认 500）弹出最旧的；过期（`SESSION_TTL_S` 默认 1800）在访问时检查，另有每 60 s 的后台清理。
- 同一会话的请求用锁串行，避免同时发送两条导致历史错乱。
- 估算：500 会话 × 16 条 × 约 1 KB ≈ 8 MB，在 256m 内。
- 会话只在内存中，重启丢失（MVP 可接受，README 中写明）。

验证：`test_sessions.py`（轮数上限；注入时钟测过期；LRU 淘汰；不同角色互不影响；同会话并发串行）。长跑 `scripts/soak.py`：mock LLM，1000 个会话、5000 次请求，期间用 `docker stats` 记录内存。完成标准：预热后增长 < 20 MiB，会话数不超过上限。长跑与 C 的资源测量（D-8）合并到 S4 执行。

#### B-08 鉴权、限速、并发、CORS、日志（4 h，依赖 B-03、D8）

- 令牌：`/api/chat`、`/api/asr`、`/api/characters` 要求 `Authorization: Bearer <CLIENT_TOKEN>`，用 `hmac.compare_digest` 比较；缺失或错误 → 401 `UNAUTHORIZED`。`/api/health`、`/api/audio/*` 免令牌。
- 限速：令牌桶，按 `session_id` 每分钟 `RATE_LIMIT_PER_MIN`（默认 20）；按来源 IP 再加一层，上限为前者的 2 倍，防止换 `session_id` 绕过。超限 → 429 `RATE_LIMITED` + `Retry-After`。只有直连来源是回环或私网地址（Caddy 在 compose 网络内）时才信任 `X-Forwarded-For`。桶数量上限 5000，过期清理。
- 并发：`asyncio.Semaphore(MAX_CONCURRENCY)`（默认 4）包住 chat 和 asr 处理，等待超过 2 s → 503 `OVERLOADED`。
- CORS：`CORSMiddleware`，`allow_origins = CORS_ORIGINS`（逗号分隔，默认 `http://127.0.0.1:5173,null`），方法 `GET, POST, OPTIONS`，头 `Authorization, Content-Type`。Electron 打包后实际的 Origin 由 A1-04 实测（A 计划 §10 第 10 条）。
- 请求体大小：chat ≤ 16 KB；asr ≤ 1 MB + 64 KB（multipart 开销）；超限 → 400 `BAD_REQUEST`。
- 日志：JSON 行写 stdout，字段 `ts`、`request_id`、`path`、`status`、`latency_ms`、`session_hash`（sha256 前 8 位）、`llm_ms`、`tts_ms`、`tts_node`、`error_code`。`LOG_USER_TEXT=false`（默认）时不记录用户和回复原文；任何时候都不记录令牌和 Key。

验证：`test_security.py`（无令牌 401；错令牌 401；令牌为空时放行并告警；第 21 次请求 429；并发超限 503；CORS 预检；超大请求体 400）；`test_logging.py`（默认日志不含用户原文和令牌）。

#### B-09 VM-1 部署（3 h，依赖 B-03、H-09；H-13 10-30）

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

#### B-10 `/api/asr` 代理（3 h，依赖 B-03、H-02、H-11；本计划新增）

- 鉴权、限速、并发同 B-08。
- 读取 multipart：`file` 必填，按字节计数，超过 1 MB 立即停止读取并返回 400；`language` 默认 `zh-CN`。不在 orchestrator 解析 WAV（由 asr_gateway 校验，避免两处规则不一致）。
- 转发到 `ASR_GATEWAY_URL/api/asr`，带 `X-Internal-Token`，超时 `ASR_CALL_TIMEOUT_S`（12 s，WA-12）。
- 映射：200 透传 `text`、`provider`、`confidence`、`error`（含 `ASR_EMPTY`）；400 透传 message；503、超时、连接失败、内部 401（配置错误）、`ASR_GATEWAY_URL` 未配置 → 503 `ASR_UNAVAILABLE`（WA-05）。
- 不落盘，日志只记字节数和耗时。

验证：`test_asr_proxy.py`（`httpx.MockTransport`：成功；`ASR_EMPTY`；400 透传；503；超时；未配置；超大文件；无令牌）。

### 5. 测试计划

#### 5.1 单元测试（pytest，`server/orchestrator/tests/`）

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

#### 5.2 合同测试

- `test_fixtures_schema.py` 保证样例本身合法。
- `test_contract_responses.py`：mock 模式下实际调用 `/api/chat`（正常、`TTS_UNAVAILABLE`、`LLM_UNAVAILABLE`、未知枚举、`/mock:bad_json`）和错误路径，用 schema 校验真实响应。
- 同一套 fixtures 被 A1 的 `contract.test.ts` 和 C 的网关测试使用（总览 §1 第 3 条）。

#### 5.3 本机联调（S3，按 C 计划 §5.3 起 4 个进程）

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

#### 5.4 CI（`.github/workflows/orchestrator.yml`）

ubuntu-latest，Python 3.11；`pip install -r requirements-dev.txt`；`pytest -q -m "not llm_live"`。触发路径：`server/orchestrator/**`、`server/common/**`、`character_pack/**`、该 workflow 文件本身。

### 6. 对外交付与 Mock

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

### 9. 审计输出

- 文件：`audit/thread_b_audit.{md,json}`，格式沿用工作报告 v2，两份结论一致。
- JSON 字段：`report_format`、`thread: "b"`、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`contract{version,merged_pr,approvals[]}`、`llm_live{rounds,json_valid,enum_valid,provider,model}`（模型名可写，Key 不写）、`soak{requests,sessions,mem_start_mib,mem_end_mib}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。
- 证据：pytest 输出摘要；CI 链接；health 与 chat 的 curl 输出（令牌用 `***` 代替）；`docker stats` 记录。
- 敏感信息扫描：同 C 计划 §9.3，范围加上 `server/orchestrator/`。

---

## 附录 E：v1 线程 C 计划节选（第 3 ~ 6、9 节）

- 来源：`docs/implementation/THREAD_C_IMPLEMENTATION_PLAN.md`。未收录的小节（如第 1、2、7、8、10 节）已被正文取代，需要时查源文件
- 已被取代的内容：VM-3、VM-4 的部署、4.11 内存预算、4.12 防火墙矩阵、5.4 演练表已被正文第 1 部分第 3、8 节和第 4 部分第 3、5 节取代。

### 3. 文件变更清单

路径按 G-02 迁移后的根目录结构。“修改”指 G-02 迁入的占位文件。

| 路径 | 新建/修改 | 任务 ID | 说明 |
| --- | --- | --- | --- |
| `server/tts_gateway/app/`（`main.py`、`config.py`、`models.py`、`errors.py`、`auth.py`、`cache.py`、`voices.py`、`mp3.py`） | 新建 | C-02 | 路由、配置、pydantic 模型、WA-05 错误、内部令牌、缓存、音色表、MP3 帧工具 |
| `server/tts_gateway/app/providers/`（`base.py`、`mock.py`、`edge_tts_provider.py`、`azure_tts.py`） | 新建 | C-02 | provider 抽象；`azure_tts.py` 仅在 O-01 提供 Key 时实现 |
| `server/tts_gateway/tests/`（`test_*.py`、`fixtures/voices.test.yaml`） | 新建 | C-02 | §5.1 |
| `server/tts_gateway/`（`requirements.txt`、`requirements-dev.txt`、`Dockerfile`、`.dockerignore`、`.env.example`） | 新建 | C-02 | 依赖用 `==` 锁定 |
| `server/tts_gateway/README.md` | 修改 | C-02 | 本机运行、变量、mock 模式、测试命令 |
| `server/asr_gateway/app/`（`main.py`、`config.py`、`models.py`、`errors.py`、`auth.py`、`audio.py`、`providers/{base,mock,cloud_*}.py`） | 新建 | C-04 | `cloud_*` 的具体名称由 O-01 决定 |
| `server/asr_gateway/tests/`（`test_*.py`、`fixtures/README.md`、`fixtures/sample_zh_16k.wav`） | 新建 | C-04 | 样例为 4 号自录 3 秒、约 100 KB，来源写在 `fixtures/README.md` |
| `server/asr_gateway/`（requirements、Dockerfile、`.dockerignore`、`.env.example`）、`README.md` | 新建 / 修改 | C-04 | 同 TTS |
| `deploy/vm2-tts/`（`compose.yaml`、`.env.example`）、`README.md` | 新建 / 修改 | C-03 | |
| `deploy/vm3-asr/`（`compose.yaml`、`.env.example`）、`README.md` | 新建 / 修改 | C-05 | |
| `deploy/vm4-fallback/`（`compose.yaml`、`.env.example`、`cron.example`）、`README.md` | 新建 / 修改 | C-06 | 备用 TTS、健康检查与备份的 cron 模板 |
| `deploy/vm1-gateway/Caddyfile`、`deploy/vm1-gateway/compose.caddy.yaml` | 新建 | C-09 | 叠加文件；`compose.yaml`、`.env.example` 属于 B-09，C 不改 |
| `scripts/healthcheck.sh`、`scripts/hosts.example.conf`、`scripts/tests/test_healthcheck.py` | 新建 | C-07 | 真实 `hosts.conf` 不进仓库 |
| `scripts/install_vm.sh`、`scripts/backup_config.sh`、`scripts/update_all.sh` | 新建 | C-08 | |
| `scripts/README.md` | 修改 | C-08 | 用法、授权要求、回滚 |
| `docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` | 修改 | C-10 | 正式版 |
| `.gitignore` | 修改（不存在则新建） | C-02 | 追加 `.env`、`**/.env`、`scripts/hosts.conf`、`temp/`；与 G-03 协调，避免冲突 |
| `.github/workflows/voice-ops.yml` | 新建 | C-02、C-07 | ubuntu：两个网关的 pytest、`shellcheck scripts/*.sh`（WA-11，C 独立维护） |
| `audit/server_verification/2026-10-xx_c01.{md,json}`、`latest_c01.{md,json}` | 新建 | C-01 | 已脱敏 |
| `audit/thread_c/`（stats 日志、演练记录） | 新建 | C-03 ~ S4 | 已脱敏 |
| `audit/thread_c_audit.{md,json}` | 新建 | 全部 | §9 |

不改：`character_pack/voices/voices.yaml`（2 号维护，C 只读）、`server/common/`（3 号维护，C 只提样例）、`server/orchestrator/`、客户端。

### 4. 任务实施细节

#### 4.1 C-01 服务器核实（D7）

目标：核实 4 台 VM 的规格与网络，关闭“拓扑不一致”遗留项，输出 H-09 第一部分。

步骤：

1. 向拥有者确认 O-03（登录方式、云防火墙/NSG 只读权限）。凭据只放 4 号本机的密钥管理器。
2. 每台执行下列只读命令。原始输出存放在 4 号本机的仓库外目录 `<private-dir>`，不提交。

```bash
nproc; lscpu | grep -E 'Architecture|Model name|^CPU\(s\)'
free -m; swapon --show
df -h /; lsblk -d -o NAME,SIZE,TYPE
uname -a                      # 记录时删去主机名字段
cat /etc/os-release
timedatectl | grep -E 'Time zone|NTP service'
docker --version; docker compose version     # 未安装记为“无”
systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'   # 只记服务名，避免误停
ss -tlnH                      # 已监听端口，记录时只保留端口号
sudo ufw status verbose       # 只读；无 sudo 记“未验证”
ip -br addr                   # 只用于判断各台是否同一私网段，不记录地址
for u in https://speech.platform.bing.com https://pypi.org/simple/ \
         https://registry-1.docker.io/v2/ https://download.docker.com; do
  curl -sS -o /dev/null -m 10 -w "$u %{http_code} %{time_total}s\n" "$u" || echo "$u FAIL"
done                          # 任何 HTTP 码都算可达；云 ASR 端点在 O-01 后补测
```

3. VM-4 上测到其他三台 22 端口的连通性：`nc -zv -w 3 <vmN-private> 22`。只记成功或失败。
4. 拥有者或 4 号在云控制台只读查看 NSG 入站规则，只记“端口 / 来源类别（任意、管理端、某台 VM）”。同时记录 B 系列 CPU 基线与积分指标是否可见（需验证）。
5. 填写记录模板（每台一列），存为 `audit/server_verification/2026-10-xx_c01.md`，内容相同的 JSON 一份，再复制为 `latest_c01.*`。

| 字段 | VM-1 | VM-2 | VM-3 | VM-4 |
| --- | --- | --- | --- | --- |
| 规格名（云控制台） / vCPU / 架构 | | | | |
| 内存 total / available（MiB）；swap | | | | |
| 系统盘大小 / 可用 | | | | |
| OS 版本 / 内核版本 | | | | |
| 时区 / NTP | | | | |
| Docker / Compose 版本 | | | | |
| 已运行的非系统服务（名称） | | | | |
| 已监听端口 | | | | |
| ufw 状态 / NSG 入站摘要 | | | | |
| 出口：Edge TTS / PyPI / Docker Hub / Docker apt | | | | |
| 与其他 VM 同一私网：是 / 否 | | | | |
| 核实时间、核实人 | | | | |

6. 关闭“拓扑不一致”：两种拆法的来源分别是 README §5 / WA-01（VM-2 TTS、VM-3 ASR、VM-4 备用 + 备份 + 健康检查），以及 commit `58572b0` 中 `docs/PROJECT_PLAN.md` §5（PR #1 早期版本，后续提交已删除：VM-2 LLM 适配 + 会话，VM-3 TTS，VM-4 ASR + 静态音频）。LLM 走外部 API（上层计划假设 3），会话在 orchestrator 内存中（B-07），不需要单独一台 LLM 适配 VM。因此，C-01 规格一致时采用 README §5 拓扑。结论写入 C-01 记录的“决定”段，3 号在 PR 中确认后，审计 `open_items` 标记为 closed。规格不一致（例如某台内存更大）时，把 VM-1 放在内存最大的一台，只改映射，不改拓扑。

产出：C-01 记录（MD + JSON）；D7 结论草案。验证：§9.3 的脱敏扫描无命中；3 号确认。完成标准：4 列全部填完，或标“未验证 + 原因”。工时 4 h。依赖：O-03。

#### 4.2 C-02 tts_gateway

目标：本机可运行，含 mock，交付 H-08（10-19）。

目录：

```text
server/tts_gateway/
├─ app/
│  ├─ main.py          # FastAPI：/api/health、POST /api/tts、GET /api/audio/{audio_id}.mp3
│  ├─ config.py        # 读 WA-10 环境变量；INTERNAL_TOKEN 为空时拒绝启动
│  ├─ models.py        # TTSRequest / TTSResponse / HealthResponse / ErrorBody（pydantic v2）
│  ├─ errors.py        # WA-05 错误对象与异常处理
│  ├─ auth.py          # X-Internal-Token，hmac.compare_digest
│  ├─ cache.py         # 落盘、TTL、LRU、single-flight
│  ├─ voices.py        # voices.yaml 读取与 emotion 微调
│  ├─ mp3.py           # 帧头解析求时长；静音帧生成
│  └─ providers/{base,mock,edge_tts_provider,azure_tts}.py
├─ tests/  requirements.txt  requirements-dev.txt  Dockerfile  .env.example  README.md
```

步骤：

1. 接口按 §6.1（H-02）实现。请求校验：`text` 去首尾空白后 1 ~ `TTS_MAX_TEXT_CHARS`（默认 300）字；`speed` 0.5 ~ 2.0；未知 `emotion` 改为 `neutral`（WA-04）；未知 `voice_id` 改用 `default_voice_id` 并记 warning。
2. `audio_id` 由网关计算，orchestrator 不重算：`sha256("{voice_id}|{speed:.2f}|{emotion}|{text}")` 取前 32 位十六进制。四个值都是回退和规范化（NFC、strip）之后的值。
3. provider 抽象（`providers/base.py`）：

```python
class TTSProvider(Protocol):
    name: str                                    # 写入响应 provider 和 /api/health
    async def synthesize(self, text: str, voice: ResolvedVoice) -> bytes: ...   # 返回 MP3；失败抛 ProviderError
```

| provider | 实现要点 | 外部依赖 |
| --- | --- | --- |
| `mock` | 不联网。拼接 MPEG-2 Layer III 静音帧（24 kHz、48 kbps、单声道，帧头 `FF F3 64 C0`，帧长 144 字节，每帧 24 ms，其余字节为 0），时长 = clamp(字数 × 120 ms, 500, 10000)。`TTS_MOCK_FAULT=none\|fail\|hang` 供演练（WA-10）。帧头常量在实现时用 `ffprobe` 和 Chromium `<audio>` 验证（需验证） | 无 |
| `edge_tts` | 使用 Python 包 `edge-tts`（rany2/edge-tts）：`Communicate(text, voice, rate=…, pitch=…)`，用流式接口收集音频块。输出 MP3（Edge 常用格式为 24 kHz 单声道，需验证）。该端点不支持自定义 SSML 风格（需验证），emotion 只映射为 rate/pitch 微调。版本锁定到实施时最新稳定版并记录在 requirements.txt | Edge 在线服务，非官方 |
| `azure`（可选） | O-01 提供 Key 才做。用 httpx 调 Azure Speech TTS REST，SSML + `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`；不引入 SDK，镜像更小。部分音色支持 `mstts:express-as` 风格（需验证） | Azure Speech 资源 |

4. `duration_ms`：`mp3.py` 解析帧头，按帧数和采样率计算，不依赖 ffmpeg。
5. 缓存（`cache.py`）：
   - 落盘：`$TTS_CACHE_DIR/{audio_id}.mp3`，元数据放在 `{audio_id}.json`（duration_ms、provider、created_at）。先写 `.tmp`，再用 `os.replace` 原子替换。
   - 命中时用 `os.utime` 刷新 mtime，作为 LRU 依据。
   - TTL：`TTS_CACHE_TTL_H`（默认 72）。启动时清理一次，之后每 10 分钟后台清理一次。
   - 容量：总量超过 `TTS_CACHE_MAX_MB`（默认 200）时，按 mtime 从旧到新删除，降到上限的 80%。
   - 并发：同一 `audio_id` 用 `asyncio.Lock` 做 single-flight，provider 只调用一次。全局 `asyncio.Semaphore(TTS_MAX_CONCURRENCY=4)`，排队超过 2 秒返回 `OVERLOADED`。
   - TTS 缓存可以重新生成，不备份。
6. `voices.py`：读 `VOICE_MAP_FILE`。2 号的 H-07 未到时使用下面的格式提案（2 号确认后定稿）。文件缺失或格式错误时拒绝启动，并给出清楚的报错：

```yaml
version: 1
default_voice_id: arknights_fan_default
voices:
  arknights_fan_default:
    provider_voices: {edge_tts: zh-CN-XiaoyiNeural, azure: zh-CN-XiaoyiNeural}   # 以 `edge-tts --list-voices` 实际输出为准
    rate: "+0%"
    pitch: "+0Hz"
    emotion:                      # 可选；未列出的 emotion 不微调
      smile:   {rate: "+5%",  pitch: "+2Hz"}
      worried: {rate: "-5%",  pitch: "-1Hz"}
      sad:     {rate: "-10%", pitch: "-2Hz"}
```

   最终 rate = 基础 rate + emotion 微调 + (speed − 1) × 100%，限制在 −50% ~ +100%。只使用 provider 提供的通用音色，不做声音克隆（README §19）。
7. 超时与错误：provider 调用 `TTS_TIMEOUT_S`（默认 5 秒，须短于 orchestrator 的 `TTS_CALL_TIMEOUT_S` 6 秒，WA-12），网关内不重试，由 orchestrator 切到 VM-4（B-06）。provider 异常或超时返回 503 `TTS_UNAVAILABLE`。日志不记录原文全文，只记录 `audio_id`、字数、耗时和 provider。
8. `/api/health` 不调用 provider：缓存目录不可写或配置无效时为 `down`；最近 5 分钟 provider 失败率 ≥ 50% 时为 `degraded`；其他情况为 `ok`。
9. Dockerfile：`python:3.11-slim`，非 root 用户，`pip install --no-cache-dir -r requirements.txt`，用 `python -c "urllib.request…"` 做 HEALTHCHECK（slim 镜像没有 curl），`uvicorn app.main:app --host 0.0.0.0 --port 8082 --workers 1`。

产出：`server/tts_gateway/` 全部文件。验证：

```bash
cd server/tts_gateway && pip install -r requirements-dev.txt && pytest -q
TTS_PROVIDER=mock INTERNAL_TOKEN=dev VOICE_MAP_FILE=tests/fixtures/voices.test.yaml uvicorn app.main:app --port 8082
curl -s -H "X-Internal-Token: dev" -H "Content-Type: application/json" \
  -d '{"text":"博士，今天也辛苦了。","voice_id":"arknights_fan_default","emotion":"smile","speed":1.0}' \
  http://127.0.0.1:8082/api/tts        # 连续两次：第二次 cache_hit=true，耗时明显更短
docker build -t arknights/tts_gateway:dev server/tts_gateway
```

完成标准：§5.1 的 TTS 用例全部通过；mock 模式不联网可运行；`edge_tts` 在本机真实合成 1 句（`pytest -m network`，结果记入审计）。工时 10 h。依赖：H-02 定稿；H-07（可用测试 fixture 替代）。

#### 4.3 C-03 VM-2 部署

步骤：

1. 拥有者授权后，在 VM-2 执行 `install_vm.sh --role vm2 --apply`（C-08a）。
2. `git clone` 到 `/opt/arknights`，checkout 指定 tag。`cp deploy/vm2-tts/.env.example deploy/vm2-tts/.env`，填写 `INTERNAL_TOKEN`、`BIND_ADDR`（VM-2 私网地址）、`IMAGE_TAG`（git 短 SHA）。
3. `compose.yaml` 要点：`build: ../../server/tts_gateway`、`image: arknights/tts_gateway:${IMAGE_TAG}`、`ports: ["${BIND_ADDR}:8082:8082"]`（不绑 `0.0.0.0`，原因见 §4.12）、具名卷 `tts_cache:/data/cache`、只读挂载 `character_pack/voices/voices.yaml`、`mem_limit: 256m`、`restart: unless-stopped`、`logging: json-file max-size 10m max-file 3`。
4. `docker compose up -d --build`，然后从 VM-1 与 VM-4 调用 `/api/health` 和一次 `/api/tts`。
5. 1 小时资源测量（§4.11）。

验证：`docker compose ps` 显示 healthy；VM-1 上 curl `/api/tts` 返回 200；从管理端直连 8082 失败（证明端口未对公网开放）。完成标准：1 小时无 OOM，`OOMKilled=false`，`RestartCount=0`，stats 日志存入 `audit/thread_c/`。工时 3 h。依赖：C-01、C-02、C-08a、O-03。

#### 4.4 C-04 asr_gateway

步骤：

1. 接口按 §6.1，目录结构与 tts_gateway 相同（`app/main.py`、`audio.py`、`providers/`）。uvicorn 单 worker，端口 8083。
2. `audio.py` 用标准库 `wave` 校验，顺序如下，任一项失败都返回 400 `BAD_REQUEST`，message 写明具体原因：
   - 字段 `file` 存在；读取不超过 1,048,576 字节，超出立即停止读取；
   - RIFF/WAVE、PCM（`wave` 只接受 PCM）；
   - 单声道、16 bit（sampwidth = 2）、16000 Hz；
   - 时长 = nframes / 16000 ≤ 30 秒；
   - `language` 在白名单内（默认 `zh-CN`；其余由 provider 支持情况决定）。
   - 30 秒 16 kHz 16 bit 单声道约 960 KB，符合 1 MB 上限。
3. provider 抽象：`async def recognize(wav: bytes, language: str) -> ASRResult(text, confidence)`。
   - `mock`：用 `array` 计算 RMS，低于阈值返回空文本，即 `ASR_EMPTY`；否则返回 `ASR_MOCK_TEXT`（默认“博士，今天有什么任务？”）。支持 `ASR_MOCK_FAULT=none|fail|hang`。
   - 云 provider：由 O-01 的账号决定，先只写抽象和 `httpx.MockTransport` 单测。若为 Azure：短音频 REST 接口接受 WAV/PCM 16 kHz 单声道，单次最长 60 秒，需要 `language` 查询参数；`RecognitionStatus` 的 `Success` 映射为文本，`NoMatch`、`InitialSilenceTimeout`、`BabbleTimeout` 映射为 `ASR_EMPTY`，`Error`、5xx、401/403、超时映射为 `ASR_UNAVAILABLE`（401/403 只写日志，不把细节返回客户端）。`format=detailed` 时取 `NBest[0].Confidence`。其他厂商写对应映射表，需验证。
4. 超时 `ASR_TIMEOUT_S`（默认 10 秒），并发上限 `ASR_MAX_CONCURRENCY=2`。
5. 隐私：不落盘音频，日志只记录字节数、时长、耗时和状态，不记录识别文本。音频会发给第三方云服务，这一点交给 2 号写入 `VOICE_POLICY.md`。

验证：`pytest -q`；`curl -H "X-Internal-Token: dev" -F file=@tests/fixtures/sample_zh_16k.wav -F language=zh-CN http://127.0.0.1:8083/api/asr`。完成标准：§5.1 的 ASR 用例全部通过；O-01 就绪时用样例 WAV 实测云识别一次，并记入审计。工时 7 h（mock + 校验 4 h，云 provider 3 h）。依赖：H-02、D5、O-01（仅云 provider）。

#### 4.5 C-05 VM-3 部署

与 C-03 相同：`deploy/vm3-asr/compose.yaml`，端口 `${BIND_ADDR}:8083`，`mem_limit: 256m`，不挂数据卷。`.env` 填写 `ASR_PROVIDER`、`ASR_API_KEY`（真实值只放 VM 上的 `.env`，权限 600）。验证：VM-1 上 `/api/health` 为 ok；用样例 WAV 调一次 `/api/asr`；1 小时资源测量。工时 2 h。依赖：C-01、C-04、C-08a。

#### 4.6 C-06 VM-4：备用 TTS、备份、健康检查

1. 备用 TTS：`deploy/vm4-fallback/compose.yaml` 使用与 VM-2 相同的 `IMAGE_TAG`，端口 `${BIND_ADDR}:8082`，`mem_limit: 256m`，缓存卷各自独立。provider 默认 `edge_tts`。O-01 提供 Azure Key 时，VM-4 改用 `azure`，避免两台依赖同一上游（R-02）。
2. 备份（`backup_config.sh`，C-08b）：

| 项 | 内容 | 频率 | 保留 |
| --- | --- | --- | --- |
| 部署配置 | `deploy/<vm>/`（不含 `.env`）、`Caddyfile`、`.release`（当前/上一个 tag 与 git SHA） | 每日 03:30 + 每次更新前 | VM-4 保留 14 份；各台本地保留 3 份 |
| `.env` | 不备份明文。只记录键名列表和每个值的 `sha256` 前 8 位，用于发现漂移。真实值保存在拥有者的密码管理器中 | 同上 | 同上 |
| 系统配置 | `ufw status numbered`、`/etc/docker/daemon.json`、crontab、`swapon --show` | 同上 | 同上 |
| 镜像清单 | `docker image ls --format '{{.Repository}}:{{.Tag}}'` | 同上 | 同上 |
| 容器日志 | 最近 24 h `docker compose logs`（应用日志本身不含原文和令牌），gzip 压缩 | 每日 | 7 份 |
| 不备份 | TTS 缓存（可再生）、`caddy_data` 中的私钥、音频、`.env` 明文 | — | — |

   传输：VM-4 用专用只读密钥拉取，对端 `authorized_keys` 写成 `restrict,command="…/backup_config.sh --emit"`，只能执行这一条命令。新增密钥需要拥有者授权；未授权时只做本地备份，4 号每周手动取回一次。恢复步骤（写入 C-10）：解包 → 从密码管理器回填 `.env` → `docker compose up -d` → healthcheck。
3. 定时任务（`deploy/vm4-fallback/cron.example`）：`*/5 * * * * healthcheck.sh -c /opt/arknights/hosts.conf -q >> /var/log/arknights/health.log 2>&1`，并写入最近状态文件 `health.latest`。logrotate 保留 7 天。MVP 不做告警推送；需要时另行决定渠道。

验证：停 VM-2 的 tts 容器后，经 VM-1 的 `/api/chat` 仍返回 `audio_url`，且 URL 中的节点为 `vm4`（与 B-06 联调）；`tar -tzf` 显示备份包不含 `.env`，`env.keys` 每行只有“键名 + 8 位哈希”；在 VM-4 上演练恢复一次。工时 4 h。依赖：C-02、C-07、C-08b。

#### 4.7 C-07 `scripts/healthcheck.sh`

- 输入：`-c <hosts.conf>`（默认 `/opt/arknights/hosts.conf`，`.gitignore` 排除）。仓库只提交 `scripts/hosts.example.conf`：

```text
# vm   service        url
vm1    orchestrator   https://<vm1-host>/api/health
vm2    tts_gateway    http://<vm2-private>:8082/api/health
vm3    asr_gateway    http://<vm3-private>:8083/api/health
vm4    tts_gateway    http://<vm4-private>:8082/api/health   # 端口只绑私网地址，127.0.0.1 不通
```

- 选项：`-t <秒>` 单项超时（默认 5，curl `--connect-timeout 3 --max-time 5`）；`-q` 只输出非 ok 项和汇总。依赖 bash、curl、python3（解析 JSON）；缺少依赖时退出码为 3。
- 判定：HTTP 200 且 JSON `status=ok`、`service` 与配置一致 → `ok`；`status=degraded` → `degraded`；`status=down`、非 200、超时、连接拒绝、JSON 无效或 `service` 不一致 → `down`。orchestrator 的 `llm/tts/asr` 字段原样放进 detail。
- 输出（每台每服务一行，最后一行汇总）：

```text
2026-11-04T10:00:00+08:00 vm1 orchestrator ok       http=200 1.12s llm=ok tts=degraded asr=ok
2026-11-04T10:00:01+08:00 vm2 tts_gateway  down     http=000 5.00s timeout
2026-11-04T10:00:01+08:00 vm3 asr_gateway  ok       http=200 0.08s provider=mock
2026-11-04T10:00:01+08:00 vm4 tts_gateway  ok       http=200 0.02s provider=edge_tts
SUMMARY ok=3 degraded=0 down=1 failed=vm2/tts_gateway
```

- 退出码：0 全部 ok；1 有 degraded、无 down；2 有 down；3 配置或依赖错误。
- 运行位置：VM-4 的 cron（可以访问所有私网地址）；管理端只能检查 VM-1。

验证：`shellcheck scripts/*.sh`、`bash -n`；`scripts/tests/test_healthcheck.py` 起本地桩服务（ok / degraded / 500 / 挂起 / service 不一致），断言输出行和退出码；S4 时逐台停服务实测（§5.4）。工时 4 h。依赖：C-03、C-05；VM-1 行依赖 B-09。

#### 4.8 C-08 安装、备份、更新脚本

三个脚本共同规则：`set -euo pipefail`；默认 dry-run，只打印将要执行的命令；`--apply` 才执行，并要求 `--approved-by <name>`，写入 `/var/log/arknights/ops.log`。不输出任何 `.env` 值。

C-08a `install_vm.sh --role vm1|vm2|vm3|vm4`（2.5 h）：

1. 检查 OS 与 C-01 记录一致，不一致时退出。
2. 按 Docker 官方 apt 仓库安装 Docker Engine 和 compose 插件（已安装则跳过）。
3. 建部署用户和 `/opt/arknights`、`/var/log/arknights`。
4. swap：没有 swap 且磁盘可用 ≥ 5 GiB 时，建 1 GiB `/swapfile`，`vm.swappiness=10`（WA-02）。
5. 防火墙只在加 `--firewall` 时执行：先打印当前规则，先确认放行 22，再按 §4.12 加规则，最后才 `ufw enable`；禁止 `ufw reset`。执行前需要拥有者在场，并确认可用云控制台串行终端兜底（防止 SSH 断连）。
6. 可重复执行，第二次运行无变化。

C-08b `backup_config.sh --emit|--pull|--local`（1.5 h）：内容见 §4.6 备份表。`--emit` 只把打包结果写到 stdout，供 VM-4 受限密钥调用。

C-08c `update_all.sh --tag <tag>`（2 h）：

1. 顺序：VM-4 → VM-2 → VM-3 → VM-1（先更新备用 TTS，主 TTS 更新期间由备用顶上）。
2. 每台：在 `.release` 记录当前 tag → `git fetch && git checkout <tag>` → `IMAGE_TAG=<sha> docker compose up -d --build` → 60 秒内轮询 `/api/health`。
3. 失败：checkout 回上一个 tag，用仍在本地的旧镜像 `up -d`（不重新构建），停止后续 VM，退出码 2。
4. 每个服务只保留最近 2 个 tag 的镜像（`docker image ls` 按 tag 筛选后删除更早的镜像）。

验证：`shellcheck`；`scripts/tests/test_ops_dryrun.py` 断言 dry-run 输出不含令牌和地址、`backup_config.sh --local` 的包不含 `.env`；S4 在一台 VM 上故意部署一个健康检查失败的 tag，确认自动回滚（演练 D-6）。工时合计 6 h。依赖：C-01。

#### 4.9 C-09 VM-1 HTTPS（Caddy）

`deploy/vm1-gateway/Caddyfile`：

```text
{$VM1_DOMAIN} {
    encode gzip
    request_body {
        max_size 2MB
    }
    reverse_proxy orchestrator:12393
    header -Server
    log {
        output stdout
        format json
    }
}
```

`compose.caddy.yaml`：服务 `caddy`（`caddy:2` 镜像，实施时锁定具体版本），`ports: ["80:80", "443:443"]`，卷 `caddy_data`、`caddy_config`，只读挂载 `Caddyfile`，`mem_limit: 96m`，`restart: unless-stopped`。启动命令见 WA-10。

- 证书：Caddy 自动 HTTPS，需要 `VM1_DOMAIN` 的 DNS 指向 VM-1，NSG 放行 80 和 443。80 只用于 ACME 校验和跳转（已写入 WA-08）。
- 日志：Caddy 默认不记录 `Authorization` 头的值（需验证当前版本行为）；不开 `log_credentials`。
- O-02 未就绪：S3 用 `http://<vm1-host>:12393`，NSG 来源限定为团队 IP；S4 前如仍无域名，用 sslip.io 类域名申请证书（需拥有者同意）。
- 公网鉴权仍在 orchestrator（B-08），Caddy 不做鉴权。

验证：`curl -sS https://<vm1-host>/api/health`；`curl -sI http://<vm1-host>/` 返回 308；`openssl s_client -connect <vm1-host>:443 -servername <vm1-host> </dev/null | openssl x509 -noout -issuer -dates`；从公网访问 12393 失败。完成标准：客户端用 https 地址对话成功（AC-02）。工时 3 h。依赖：B-09（H-13）、O-02。

#### 4.10 C-10 正式文档

`docs/SERVER_DEPLOYMENT.md` 目录：1 架构与端口表；2 前置条件（O-03、域名、Key）；3 每台 VM 从零部署（`install_vm.sh` → clone → `.env` → `compose up` → 验证）；4 防火墙与 NSG 矩阵（§4.12）；5 健康检查；6 更新与回滚；7 备份与恢复；8 故障排查表（症状 → 检查命令 → 处理）；9 资源与调参（§4.11）；10 安全注意事项（不提交 `.env`、令牌轮换步骤）。

`docs/TTS_ASR_GUIDE.md` 目录：provider 切换；`voices.yaml` 字段；内部接口摘要（链接 §6.1）；缓存与清理；mock 与故障注入；ASR 音频格式与错误码；合规（链接 `VOICE_POLICY.md`）。

验证：非作者（3 号或 2 号）只看文档，在一台 VM 上从零部署，记录耗时和卡住的步骤，4 号据此修订（AC-16 部署部分）。工时：4 号 4 h，非作者 2 h（记入对方工时）。依赖：C-07、C-08。

#### 4.11 内存预算与资源测量

| VM | 容器（mem_limit） | 预计常驻（未实测） | 系统 + Docker（未实测） | 合计上限 |
| --- | --- | --- | --- | --- |
| VM-1 | orchestrator 256m、caddy 96m | 约 80 + 30 MiB | 约 300 MiB | < 700 MiB |
| VM-2 | tts_gateway 256m | 约 80 MiB | 约 300 MiB | < 600 MiB |
| VM-3 | asr_gateway 256m | 约 70 MiB | 约 300 MiB | < 600 MiB |
| VM-4 | tts_gateway 256m；cron 脚本 | 约 80 MiB | 约 300 MiB | < 600 MiB |

每台另配 1 GiB swap（C-08a）。测量方法（每台 1 小时，结果存 `audit/thread_c/<vm>_stats_<date>.log`，复制到本地前脱敏）：

```bash
( for i in $(seq 60); do date -Is; docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}'; sleep 60; done ) > stats.log &
for i in $(seq 360); do curl -s -o /dev/null -w '%{http_code} %{time_total}\n' <本台业务请求>; sleep 10; done > latency.log
docker inspect --format '{{.Name}} OOMKilled={{.State.OOMKilled}} Restarts={{.RestartCount}}' $(docker ps -q)
free -m
```

同时观察延迟是否随时间上升（B 系列 CPU 积分耗尽的迹象；积分指标能否在控制台看到需验证）。

#### 4.12 防火墙矩阵

| VM | 端口 | 允许来源 | 控制层 |
| --- | --- | --- | --- |
| VM-1 | 22 | `<admin-src>` | NSG + ufw |
| VM-1 | 80、443 | 任意 | NSG + ufw |
| VM-1 | 12393 | 仅 S3 内测：团队 IP；之后关闭 | NSG；compose 正式环境绑 `127.0.0.1` |
| VM-2 | 8082 | VM-1、VM-4 | NSG；compose 绑私网地址 |
| VM-3 | 8083 | VM-1、VM-4 | NSG；compose 绑私网地址 |
| VM-4 | 8082 | VM-1 | NSG；compose 绑私网地址 |
| VM-2/3/4 | 22 | `<admin-src>`；VM-4（受限密钥拉备份） | NSG + ufw |
| 全部 | 出站 | 任意（Edge TTS、云 ASR、LLM、PyPI、Docker Hub） | — |

Docker 发布的端口不经过 ufw 的规则（WA-08），8082/8083 只能靠绑定地址和 NSG 控制。Azure NSG 默认规则通常放行同一 VNet 内的流量（需在 C-01 核实）；要只允许 VM-1、VM-4 访问，必须加显式拒绝规则，内部令牌作为第二层。

### 5. 测试计划

#### 5.1 单元测试（pytest）

| 模块 | 文件 | 要点 |
| --- | --- | --- |
| tts | `test_validation.py` | 字数 0/1/300/301；`speed` 边界；未知 emotion → `neutral`；未知 voice → 默认音色 |
| tts | `test_audio_id.py` | 规范化规则；固定输入的期望值（`tests/fixtures/audio_id_vectors.json`） |
| tts | `test_cache.py` | 原子写入；TTL 清理；超上限降到 80%；同一 `audio_id` 并发 10 次只调 provider 1 次 |
| tts | `test_auth.py` | 缺令牌、错令牌 401；`/api/health` 免令牌 |
| tts | `test_errors.py` | provider 失败、超时 → 503 `TTS_UNAVAILABLE`；排队超时 → 503 `OVERLOADED`；`TTS_MOCK_FAULT` |
| tts | `test_mp3.py` | 按帧数求时长；静音帧帧头 |
| tts | `test_voices.py` | 格式校验；缺文件拒绝启动；rate 合成后的上下限 |
| tts | `test_audio_get.py` | 存在 → 200 `audio/mpeg`；不存在 → 404 `AUDIO_NOT_FOUND`；`audio_id` 不是 32 位十六进制 → 404（防路径穿越） |
| asr | `test_audio_validation.py` | 每种失败原因一个用例：缺字段、> 1 MB、非 RIFF、立体声、8 bit、44.1 kHz、> 30 s、未知 language |
| asr | `test_mock.py` | 静音 → `ASR_EMPTY`；有声 → `ASR_MOCK_TEXT`；`ASR_MOCK_FAULT` |
| asr | `test_cloud_mapping.py` | `httpx.MockTransport`：各 `RecognitionStatus`、401/403/5xx、超时 |
| asr | `test_privacy.py` | 请求后无临时文件；日志无识别文本 |
| scripts | `test_healthcheck.py`、`test_ops_dryrun.py` | §4.7、§4.8 |

真实网络用例标 `@pytest.mark.network`，CI 中跳过，本机手动跑并记入审计。

#### 5.2 合同测试

3 号把 H-02 的内部接口写成 `server/common/schemas/internal_tts.json`、`internal_asr.json`（B-02）。C 的测试用 `jsonschema`（仅 dev 依赖）校验网关响应。H-04 之前用本地副本，之后删除。

#### 5.3 本机联调（S3）

uvicorn 本机起 4 个进程：orchestrator 12393、tts 8082（主）、tts 8084（模拟 VM-4）、asr 8083。orchestrator 设 `TTS_PRIMARY_URL=http://127.0.0.1:8082`、`TTS_FALLBACK_URL=http://127.0.0.1:8084`、`ASR_GATEWAY_URL=http://127.0.0.1:8083`。用 `TTS_MOCK_FAULT` 复现 IT-05，用停进程复现 IT-06。命令写入 `docs/TTS_ASR_GUIDE.md`。

#### 5.4 S4 演练（与 3 号共同执行）

| ID | 操作 | 期望 | 证据 |
| --- | --- | --- | --- |
| D-1 | 停 VM-2 的 tts 容器 | `audio_url` 节点为 `vm4`；healthcheck 报 vm2 down，退出码 2 | 命令输出 |
| D-2 | 再停 VM-4 的 tts | `audio_url = null` + `TTS_UNAVAILABLE`；客户端只显示字幕 | 输出 + 截图 |
| D-3 | 停 VM-3 的 asr | `/api/asr` 返回 503 `ASR_UNAVAILABLE`；客户端切到文本 | 输出 + 截图 |
| D-4 | 停 orchestrator 30 s 后恢复 | 客户端自动恢复 | 时间戳 |
| D-5 | 重启一台 VM | 容器自动启动，health 为 ok | `uptime`、`compose ps` |
| D-6 | 部署健康检查会失败的 tag | `update_all.sh` 自动回滚 | `ops.log` |
| D-7 | 备份恢复 | 在 VM-4 按 C-10 恢复一台的配置 | 记录 |
| D-8 | 每台 1 小时资源 | 无 OOM | stats 日志 |

### 6. 对外交付与 Mock

#### 6.1 H-02 内部接口提案（10-12 交 3 号，D2 时并入合同）

除 `/api/health` 外，所有请求都必须带 `X-Internal-Token`。错误体为 `{"error": {"code", "message"}}`（WA-05）。

`POST /api/tts`（VM-2、VM-4，端口 8082）：

```json
// 请求
{"text": "博士，今天也辛苦了。", "voice_id": "arknights_fan_default", "emotion": "smile", "speed": 1.0}
// 200 响应
{"audio_id": "3f9a…（32 位十六进制）", "audio_path": "/api/audio/3f9a….mp3", "duration_ms": 2400,
 "provider": "edge_tts", "voice_id": "arknights_fan_default", "emotion": "smile", "cache_hit": false}
```

- 响应里的 `voice_id`、`emotion` 是回退后的实际值，便于排查。
- 错误：400 `BAD_REQUEST`（字数、`speed` 越界）；401；503 `TTS_UNAVAILABLE`（provider 失败或超时）；503 `OVERLOADED`。

`GET /api/audio/{audio_id}.mp3`：200 `audio/mpeg`，`Cache-Control: public, max-age=86400`；不存在或格式不对 → 404 `AUDIO_NOT_FOUND`。是否支持 Range 取决于 Starlette 版本，需验证；orchestrator 代理时转发 `Range` 头。

`GET /api/health`：见 WA-07，1 秒内返回，不调 provider。

`POST /api/asr`（VM-3，端口 8083）：`multipart/form-data`，字段 `file`、`language`（格式同 WA-06）。

```json
{"text": "博士，今天有什么任务？", "provider": "azure", "confidence": 0.91, "error": null}
{"text": "", "provider": "azure", "confidence": null, "error": {"code": "ASR_EMPTY", "message": "未识别到语音"}}
```

- 错误：400 `BAD_REQUEST`（message 写明哪一项格式不对）；401；503 `ASR_UNAVAILABLE`。

orchestrator 处理规则（B-06、B-10 实现）：503、超时、连接失败视为节点失败，TTS 切到 VM-4；400 不重试，也不切换节点。

#### 6.2 交付表

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-02 | §6.1 | 10-12 | 3 号在 PR 中确认 |
| H-08 | tts_gateway 本机可运行（mock + edge_tts） | 10-19 | 3 号按 README 启动，`/api/tts` 返回音频 |
| H-09 | C-01 记录；VM-1 已装 Docker | 10-12；10-23 | 3 号确认记录；VM-1 上 `docker compose version` |
| H-11 | asr_gateway 本机可运行（mock） | 10-23 | 1、3 号用样例 WAV 调用成功 |
| — | `*_MOCK_FAULT` 故障注入 | 随 H-08、H-11 | 3 号本机复现 IT-05、IT-06 |

本线程接收：H-04（10-15）、H-07（10-19）、H-13（10-30）、O-01、O-02、O-03。

### 9. 审计输出

#### 9.1 文件

- `audit/thread_c_audit.{md,json}`：结论一致，格式沿用工作报告 v2。
- `audit/server_verification/2026-10-xx_c01.{md,json}` 与 `latest_c01.{md,json}`：带时间戳的记录不删，`latest_*` 指向最新一次。
- `audit/thread_c/`：stats 日志、演练记录（已脱敏）。

#### 9.2 JSON 字段

`report_format`、`thread: "c"`、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`servers[]{vm,role,spec_verified,docker,health,peak_mem_mib,oom}`、`drills[]{id,result,evidence}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`（含“拓扑不一致”的关闭记录）、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。

#### 9.3 敏感信息扫描（提交前执行）

```bash
git grep -nIE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b|BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}' \
  -- audit/ deploy/ scripts/ docs/ server/ ':!*.example' ':!*.example.conf'
```

期望只命中 `127.0.0.1`、`0.0.0.0` 或版本号类误报，每条人工确认后写入 `sensitive_scan.hits`。
