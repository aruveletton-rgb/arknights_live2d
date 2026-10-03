# 线程 A 两天实施计划：客户端 + Live2D + 角色包

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：1 号（A1 客户端 / Live2D）、2 号（A2 角色包 / 合规）
- 上层：[2 天总览](README.md)（拓扑、时间表、检查点、交接物以总览为准）
- 任务实施细节（代码片段、命令、单测要点）沿用 [v1 A 计划](../THREAD_A_IMPLEMENTATION_PLAN.md) 第 4、5 节，本文只写排期和差异

## 1. 范围与完成定义

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

## 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| H-04 合同 | 3 号 | 第 1 天 10:30 | 按 v1 总览 WA-03 ~ WA-05 先写，冻结后修订 |
| H-10 orchestrator mock | 3 号 | 第 1 天 13:00 | `VITE_MOCK_CHAT=true` |
| H-11 asr_gateway | 4 号 | 第 1 天 16:00 | `VITE_MOCK_ASR=true` |
| P-09 样例模型 | 2 号 | 开工前 | 第 1 天 09:00 ~ 10:30 内补齐 |
| VM-1 https 地址 | 3、4 号 | 第 2 天 CP5 前 | 先连本机或 VM-1 私网/白名单地址 |
| 干净 Windows（P-08） | 拥有者或 2 号 | 第 2 天 13:00 | Windows Sandbox；都没有记 `not_run` |

客户端不感知服务器数量：`audio_url` 由服务端给出完整地址，节点名改为 `primary`/`fallback`（总览第 4 节）对客户端代码没有影响，只影响测试 fixture 中的示例 URL。

## 3. 文件变更

与 v1 A 计划第 3 节相同，另加：

| 路径 | 动作 | 任务 | 说明 |
| --- | --- | --- | --- |
| `docs/DESKTOP_PET_MODE.md` | 修改 | A1-11、AC-16 | 用户部分：安装、填写服务器地址和令牌、常见问题 |
| `audit/evidence/thread_a1/`、`thread_a2/` | 新建 | 全部 | 截图；录屏只记 sha256 |
| `client/tests/fixtures/`（H-04 前临时） | 新建后删除 | A1-04 | H-04 后改读 `server/common/fixtures/` |

G-02 迁移后客户端路径为 `upstream/Open-LLM-VTuber/client/`，下文简写为 `client/`。

## 4. 时间表

### 4.1 1 号（A1）

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

### 4.2 2 号（A2）

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

## 5. 与 v1 任务细节的差异

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

## 6. 测试

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

## 7. 交付物

| ID | 内容 | 提供 | 截止 | 验收方式 |
| --- | --- | --- | --- | --- |
| H-01 | `ENUM_PROPOSAL.md` | 2 号 | D1 09:30 | 1、3 号确认 |
| H-05 | 角色 YAML + 5 个 Prompt | 2 号 | D1 13:00 | B-04 loader 通过 |
| H-06 | 样例模型说明 + `model_dict.json` | 2 号、1 号 | D1 16:00 | A1-07 加载成功 |
| H-07 | `voices.yaml` | 2 号 | D1 12:00 | tts_gateway 以此启动 |
| H-14 | 客户端录制的 WAV 样例 | 1 号 | D1 20:00 | asr_gateway 校验通过 |
| — | 客户端 Mock 模式 | 1 号 | D1 18:00 | `VITE_MOCK_CHAT=true VITE_MOCK_ASR=true npm run dev` 完整演示 |
| — | Windows 安装包 | 1 号 | D2 11:00 | M-07 |

## 8. 风险

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| Live2D 库不兼容 | AC-03、07、08 | 总览 R-04 |
| Cubism Core 不能随安装包分发（未核实） | AC-01、16 | 安装包不含 Core；文档说明用户自行放置；`ASSET_SOURCE_TABLE.md` 标 `pending` |
| 样例模型表情动作不足 | AC-07、08 | 近似映射并标注 |
| 跨域音频导致口型无数据 | AC-06 | 随机口型回退；确认 B 侧 `/api/audio/*` 的 CORS |
| Electron 打包后 Origin 不在 CORS 白名单 | AC-02 | D2 09:00 打包后立即实测，把实际 Origin 告诉 3 号加入 `CORS_ORIGINS` |
| 1 号负载集中在 D1 下午 | 进度 | CP2 时由 2 号接手 A1-02 截图和 M 系列取证；A1-11 可由 2 号在 1 号指导下执行 |

## 9. 审计

- 文件：`audit/thread_a1_audit.{md,json}`（1 号）、`audit/thread_a2_audit.{md,json}`（2 号），字段沿用 v1 A 计划 §9。
- 另加字段 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}`，记录 CP1 ~ CP7 中与本线程相关的结果。
- A2 额外检查：`git ls-files | grep -Ei '\.moc3$|\.motion3\.json$|\.exp3\.json$|live2dcubismcore'` 期望无输出。

## 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | Electron 打包后实际发送的 Origin | D2 09:00 打包后实测 |
| 2 | pixi-live2d-display 与 Electron 34 / Vite 6 兼容性 | D1 CP2 |
| 3 | Cubism Core 能否随安装包分发 | 2 天内不关闭；`pending` |
| 4 | 远程 HTTP 下麦克风可用性（只在无证书降级时相关） | D2 CP5 |
