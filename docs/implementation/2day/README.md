# 三线程并行计划总览（2 天版，2 台服务器）

- 版本：2day-v1（基于 2026-10-01 状态编制）
- 取代范围：v1 的排期（W0 ~ W6）、四服务器拓扑、每周 10 h 的工时假设与削减清单
- 继续沿用：v1 的任务 ID、公共工作假设 WA-02 ~ WA-05、WA-09、WA-11、WA-12，以及各任务的实施细节（代码片段、测试要点）。本目录只写差异
- v1 文件：`docs/EXECUTION_PLAN.md`（v1.1）、`docs/implementation/README.md`（下称“v1 总览”）、`docs/implementation/THREAD_{A,B,C}_IMPLEMENTATION_PLAN.md`（下称“v1 A/B/C 计划”）
- 现状依据：`audit/reports/2026-10-01-three-thread-work-report.md`
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（第 11 节）

| 线程 | 负责人 | 2 天计划 |
| --- | --- | --- |
| A：客户端 + Live2D + 角色包 | 1 号（A1）、2 号（A2） | [THREAD_A_2DAY_PLAN.md](THREAD_A_2DAY_PLAN.md) |
| B：编排 + API + LLM | 3 号 | [THREAD_B_2DAY_PLAN.md](THREAD_B_2DAY_PLAN.md) |
| C：TTS/ASR + 服务器部署 | 4 号 | [THREAD_C_2DAY_PLAN.md](THREAD_C_2DAY_PLAN.md) |

## 1. 目标与假设

目标：连续 2 个工作日内，在 2 台服务器上完成一次完整演示，AC-01 ~ AC-16 逐项有证据（或写明未达成原因），并提交 `audit/final_integration_audit.{md,json}`。

假设（任一不成立，按第 9 节处理）：

1. 四人两天全程在岗。不设工时上限：排期只受依赖顺序和检查点约束，不按工时削减范围。
2. 各线程用 AI 编码代理（Codex / Claude Code）生成主要代码，人负责决策、审阅和实测。v1 的工时估算（合计 226 h）按人工编码估算，不能直接换算成 2 天；本计划不再给出工时表。**这一假设未经验证**，第 1 天 14:00 的检查点 CP2 是第一次校验它的机会。
3. 第 1 天开始前，开工前清单（第 2 节）中标为“必需”的项已就绪。
4. 决策 D1 ~ D9 在启动会上一次拍板，未提出替代方案的一律取 v1 计划 §9 的默认方案。
5. LLM、TTS、ASR 全部走外部 API 或 Mock；两台服务器只跑轻量服务。
6. 演示用 Live2D 官方免费样例模型，只放本机，不提交仓库（决策 D6 默认）。正式模型不在 2 天范围内。
7. 服务器规格沿用 2 vCPU / 1 GiB（未核实，第 1 天 C-01 核实）。

## 2. 开工前清单（第 1 天 08:30 前）

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

## 3. 两台服务器拓扑（取代 WA-01、WA-08 中的四服务器部分）

### 3.1 服务与端口

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

### 3.2 内存预算（未实测，第 2 天 12:00 实测）

| VM | 容器（`mem_limit`） | 上限合计 | 预计常驻（未实测） | 系统 + Docker（未实测） | 判定线 |
| --- | --- | --- | --- | --- | --- |
| VM-1 | orchestrator 256m、caddy 96m、tts_fallback 256m | 608 MiB | 约 190 MiB | 约 300 MiB | 1 小时内 `OOMKilled=false`，`free -m` 可用内存 ≥ 150 MiB |
| VM-2 | tts_gateway 256m、asr_gateway 256m | 512 MiB | 约 150 MiB | 约 300 MiB | 同上 |

两台都配 1 GiB swap（C-08a）。VM-1 上限合计加系统已接近 1 GiB，实测超过判定线时先把 tts_fallback 降到 192m，再考虑把备用 TTS 挪到 VM-2（同时失去整机容灾，需在审计中写明）。

### 3.3 防火墙矩阵（取代 v1 C 计划 §4.12）

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

## 4. 公共工作假设的差异

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

## 5. 两天时间表

时间为建议值，以检查点（第 6 节）为准：检查点未通过时，先按第 6 节的处理方式调整，再继续后面的块。每个块的细节见各线程计划第 4 节。

### 5.1 第 1 天：合同冻结、并行实现、本机集成

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

### 5.2 第 2 天：两台部署、演练、验收

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

## 6. 检查点

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

## 7. 跨线程交接物（取代 v1 总览第 4 节的截止日期）

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

## 8. 集成、部署与演练

### 8.1 分支与合并

- 分支：`main`、`develop`，线程分支 `thread-a-desktop`（1 号）、`thread-a-character`（2 号）、`thread-b-orchestrator`（3 号）、`thread-c-voice-ops`（4 号）（G-06）。
- 合并顺序（README §16，不变）：`thread-a-character` → `thread-c-voice-ops` → `thread-b-orchestrator` → `thread-a-desktop` → `develop`。第 1 天 18:00 ~ 22:00 合并，每次合并后在 `develop` 上跑完整 CI。
- 第 1 天 CP4 之后，修复走短分支（`fix/<描述>`）PR 到 `develop`，至少 1 人审阅。
- `develop` → `main` 在 CP7 建 PR，由拥有者审批合并；不直接推 `main`，不强推。

### 8.2 本机集成（第 1 天晚间）

沿用 v1 C 计划 §5.3 的本机多进程方式：orchestrator 12393、tts 8082（primary）、tts 8084（fallback）、asr 8083。场景 IT-01 ~ IT-08 与 v1 `EXECUTION_PLAN.md` 第 7 节相同；B 侧触发方法见 v1 B 计划 §5.3。

### 8.3 两台部署（第 2 天上午）

1. 4 号：VM-2 `deploy/vm2-voice/` 启动 tts_gateway + asr_gateway；provider 有 Key 用真实值，没有用 mock（Edge TTS 不需要 Key）。
2. 3 号：VM-1 orchestrator 先绑私网地址，从 VM-1 本机 curl 验证 chat；4 号叠加 `compose.tts.yaml`（tts_fallback）和 `compose.caddy.yaml`。
3. 证书签发后，orchestrator 改绑 `127.0.0.1:12393`，NSG 关闭 12393 临时放行（最晚 CP7）。
4. 客户端改连 `https://<vm1-domain>`，重跑 IT-01 ~ IT-08（远程版）。

### 8.4 演练（第 2 天下午，取代 v1 C 计划 §5.4）

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

## 9. 风险与降级

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

## 10. 验收映射（AC-01 ~ AC-16）

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

## 11. 决策（启动会一次拍板）

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

## 12. 审计输出

- 线程审计：`audit/thread_a1_audit.{md,json}`、`audit/thread_a2_audit.{md,json}`、`audit/thread_b_audit.{md,json}`、`audit/thread_c_audit.{md,json}`，字段沿用 v1 各线程计划第 9 节；C 的 `servers[]` 只有 vm1、vm2 两项，`drills[]` 为 D-1 ~ D-9。
- 服务器核实：`audit/server_verification/<日期>_c01.{md,json}` 与 `latest_c01.{md,json}`，带时间戳的记录不删。
- 最终审计：`audit/final_integration_audit.{md,json}`，逐项给出 AC-01 ~ AC-16 的状态和证据；注明 AC-12 的修订；列出所有降级项（第 9 节）和 `not_run` 项。
- 状态规则：没有证据不写 `pass`；降级完成写 `partial` 并说明；没执行写 `not_run` 并说明原因。MD 与 JSON 结论必须一致。
- 证据规则：截图进 `audit/evidence/<线程>/`；含样例模型的录屏不进仓库，记文件名、sha256、时长和存放位置；命令输出附退出码；地址、令牌、Key 全部脱敏。
- 提交前敏感信息扫描：v1 C 计划 §9.3 的 `git grep` 命令，范围覆盖 `audit/ deploy/ scripts/ docs/ server/`。

## 13. 与 v1 的差异记录

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
