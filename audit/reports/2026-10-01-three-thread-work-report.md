# 三线程工作报告（2026-10-01）

- 报告格式：v2（本次重新设计，差异见第 8 节）
- 基准：`origin/main` @ `b2bb0f2`（最后提交 2026-07-16；全仓库最后活动 2026-07-22）
- 机器可读版：`2026-10-01-three-thread-work-report.json`（结论与本文件一致）
- 执行计划：`docs/EXECUTION_PLAN.md`

结论：项目停在 Phase 0 与 Phase 1 之间。四条子线中只有 A1 有代码（客户端原型），A2、B、C 均未开始。约 10 周没有新提交，两个 PR 都没人审阅。仓库定位（代码仓库还是说明仓库）存在未解决冲突，需最先决定。

状态枚举：通过 `pass`、部分 `partial`、未通过 `fail`、未开始 `not_started`、未验证 `unverified`、阻塞 `blocked`。

## 1. 总览

| 线程 | 负责人 | 状态 | 关键事实 | 当前阻塞 |
| --- | --- | --- | --- | --- |
| A1 客户端 + Live2D | 1 号 | partial | 33 个源文件；依赖可联网安装；`npm run build`、`npm test` 均失败 | API 合同未冻结；无授权模型 |
| A2 角色包 + 合规 | 2 号 | not_started | 只有目录 README 和 A1 起草的 `model_dict.example.json` | 枚举、模型来源未定 |
| B 编排 + API + LLM | 3 号 | not_started | `server/` 只有 README；`API_CONTRACT.md` 为草案 | D2、D3、D4 |
| C 语音 + 部署 | 4 号 | not_started | `deploy/`、`scripts/` 无实现；服务器资源未核实 | D7 |

## 2. 仓库与治理

1. `main` 上有两套结构：根目录 `.gitkeep` 骨架，以及嵌套的 `arknights-desktop-pet-vtuber_thread-a1_organized/` 整理包和同内容 zip。
2. PR #1（`docs/project-setup`，2026-07-13）把仓库定位为“说明与提问窗口，不放代码”。这和 `main` 上已上传的客户端代码、README §4 的代码仓库结构直接冲突。0 条审阅。
3. PR #2（`pjskkk-patch-1`，2026-07-22）删除 zip。zip 里有 2 个 `.env.example` 没进入 git 目录（只含 `VITE_MOCK_CHAT`，无密钥），直接合并会丢失。
4. README §16 的 `develop` 和线程分支没有建立。
5. 本机 `core.autocrlf=true`，仓库没有 `.gitattributes`。检出后为 CRLF，导致 `source_manifest.json` 在工作区 0/33 匹配；git blob 和 zip 均 33/33 匹配，源文件本身没有被改动。
6. 仓库内没有项目级 `AGENTS.md` 或 `docs/PROJECT_BASELINE.md`。

## 3. 线程详情

### 3.1 A1（1 号）：partial

已有（代码审阅）：透明无边框置顶窗口、托盘、文本输入、Mock 对话、HTTP `POST /api/chat`、`audio_url`/`audio_base64` 播放、设置持久化、角色状态机。

本次新发现：

1. `npm run build` 失败。`src/main/index.ts:22` 的 `window-all-closed` 回调声明了 `event` 参数，Electron 34 的类型是 `() => void`（TS2769、TS7006）。修复方向：去掉参数和 `preventDefault()`，订阅该事件本身就会阻止自动退出；修复后需实测托盘常驻。
2. `npm test` 失败：vitest 继承了 vite 的 `root: "src/renderer"`，找不到 `tests/`。用 `vitest run --root .` 时 3 个文件 6 个用例全部通过。
3. `npm run dev` 只启动 vite 和 `electron .`，不编译主进程。全新克隆需要先生成 `dist/main/index.js`（按脚本推断，未运行验证）。
4. 原审计记录的 `npm install` 阻塞已解除，联网安装成功。
5. 原审计声明新增的两个 `.env.example` 不在 git 中（见第 2 节）。

既有缺口（与 `INTEGRATION_GAP_REPORT.md` 一致，无变化）：响应字段用 `reply_text` 而非 `text`；情绪/动作枚举与冻结枚举冲突且没有回退；无 WebSocket 和自动重连；Live2D 只校验 URL 不渲染；口型为随机数；语音输入是占位按钮；`model_dict` 未加载；`session_id` 硬编码为 `local-user-001`；默认 `characterId=operator_default`，与 `arknights_fan_001` 不一致；默认后端 `http://127.0.0.1:8000`，与 README §13.6 的 `12393` 不一致。

### 3.2 A2（2 号）：not_started

缺：角色 YAML、5 个 Prompt 文件、`character_pack/ASSET_SOURCE_TABLE.md`、`docs/VOICE_POLICY.md`、授权 Live2D 模型及其来源登记。已有：`model_dict.example.json`，其 `emotionMap` 已使用冻结枚举。

### 3.3 B（3 号）：not_started

缺：orchestrator、mock LLM、会话管理、角色加载、TTS 调用、降级逻辑。`docs/API_CONTRACT.md` 是参考草案：没有 `/api/tts`、`/api/asr`，没有错误对象结构，没有鉴权方式。是否复用 Open-LLM-VTuber 后端没有结论。上游实际使用 WebSocket `/client-ws`，与本项目 HTTP `/api/chat` 合同不同。

### 3.4 C（4 号）：not_started

缺：`tts_gateway`、`asr_gateway`、4 套 compose、`install_vm.sh`/`healthcheck.sh`/`backup_config.sh`/`update_all.sh`、部署文档。4 × B2ats v2（2 vCPU / 1 GiB）没有登录核实。2026-07-13 审计记录的“原材料中服务器拓扑不一致”尚未关闭。

## 4. 接口矩阵

| 接口 | 提供 | 消费 | 定义位置 | 状态 |
| --- | --- | --- | --- | --- |
| `POST /api/chat` | B | A1 | `API_CONTRACT.md` | 草案；客户端字段与枚举不兼容 |
| `GET /api/characters` | B | A1 | `API_CONTRACT.md` | 草案；双方未实现 |
| `GET /api/health` | B、C 各服务 | C 健康检查、A1 重连 | `API_CONTRACT.md` | 草案 |
| `POST /api/tts` | C | B | 仅 README §10 | 未入合同 |
| `POST /api/asr` | C | A1 或 B（未定） | 仅 README §11 | 未入合同 |
| 角色 YAML | A2 | B | 仅 README §8 | 未冻结 |
| `model_dict.json` | A2 + A1 | A1 | 示例文件 | 客户端未读取 |
| emotion / motion 枚举 | A2 | B、A1 | `API_CONTRACT.md` | 客户端冲突 |

## 5. 验收映射（README §18）

| AC | 内容 | 线程 | 状态 | 依据 |
| --- | --- | --- | --- | --- |
| AC-01 | Electron 桌宠可启动 | A1 | unverified | 主进程构建失败；未启动 GUI |
| AC-02 | 可连接远端 VM-1 | A1、B、C | not_started | 无后端 |
| AC-03 | 加载 Live2D 模型 | A1、A2 | fail | 只校验 URL；无授权模型 |
| AC-04 | 文本输入获得回复 | A1、B | partial | 仅 Mock |
| AC-05 | 语音输入获得回复 | A1、C、B | not_started | 按钮占位 |
| AC-06 | TTS 生成并播放 | C、B、A1 | partial | 只有客户端播放器 |
| AC-07 | 按 emotion 切换表情 | A1、A2 | partial | 只写 `data-*` 属性 |
| AC-08 | 按 motion 播放动作 | A1、A2 | fail | 无动作播放器 |
| AC-09 | TTS 失败只显示字幕 | A1、B | partial | 客户端降级路径存在（代码审阅） |
| AC-10 | ASR 失败切换文本 | A1、C | not_started | — |
| AC-11 | 断线后重连 | A1、B | fail | 只有手动重试；传输方式待 D3 |
| AC-12 | 四台 Compose 部署 | C、B | not_started | — |
| AC-13 | 健康检查定位服务 | C | not_started | — |
| AC-14 | 文档完整 | 全员 | partial | A1 文档齐；B、C 为占位 |
| AC-15 | 合规说明完整 | A2 | partial | 缺 VOICE_POLICY、ASSET_SOURCE_TABLE |
| AC-16 | 非技术用户可部署使用 | 全员 | not_started | — |

合计：pass 0，partial 6，fail 3，not_started 6，unverified 1。

## 6. 待决事项

| ID | 问题 | 主导 | 需确认 | 阻塞 |
| --- | --- | --- | --- | --- |
| D1 | 仓库定位：代码仓库（README §4）还是说明仓库（PR #1） | 仓库拥有者 | 全员 | 全部 |
| D2 | `/api/chat` 字段与枚举冻结为合同 v1.0 | 3 号 | 1、2、4 号 | A1 对齐、B |
| D3 | 传输方式：HTTP + 健康轮询，或 WebSocket | 3 号 | 1 号 | AC-11 |
| D4 | Open-LLM-VTuber 用法：依赖后端 / 只参考 / 不用 | 3 号 | 1 号 | B、A1 |
| D5 | ASR 路线：本地或 VM-3 | 4 号 | 1、3 号 | AC-05、AC-10 |
| D6 | 授权 Live2D 模型来源 | 2 号 | 仓库拥有者 | AC-03、07、08 |
| D7 | 4 台服务器实际资源与网络 | 4 号 | 3 号 | AC-12、13 |
| D8 | VM-1 公网入口鉴权方式 | 3 号 | 4 号 | AC-02 |
| D9 | 本项目代码许可证 | 仓库拥有者 | 全员 | 发布 |

## 7. 风险

| ID | 风险 | 级别 | 缓解 |
| --- | --- | --- | --- |
| R1 | 约 10 周无提交，PR 无审阅 | 高 | 先开 D1 决策会，确认四人仍在岗 |
| R2 | 合同不冻结时 B 与 A1 各自实现，集成返工 | 高 | D2 冻结前 B 不写业务代码 |
| R3 | 1 GiB 内存跑 Docker + Python 服务可能 OOM | 中 | 只做 API 代理；compose 设内存上限；先实测 |
| R4 | 没有授权模型，AC-03/07/08 无法闭环 | 中 | 先用 Live2D 官方免费样例做开发，公开发布前替换 |
| R5 | VM-1 暴露公网无鉴权，LLM 额度被盗刷 | 中 | 共享令牌 + HTTPS + 限流 |
| R6 | 换行不统一导致审计校验失败、diff 噪声 | 低 | 加 `.gitattributes`（`* text=auto eol=lf`） |
| R7 | 合并 PR #2 会丢失 2 个 `.env.example` | 低 | 先提取进 git，再删 zip |

## 8. 本次验证记录

| 检查 | 命令或方式 | 结果 |
| --- | --- | --- |
| 仓库状态 | `git fetch origin --prune`、`git status`、`git log --all` | 工作区干净；本地与 `origin/main` 同步 |
| PR 状态 | `gh pr list --state all`、`gh pr view` | #1、#2 均 OPEN，0 审阅 |
| 依赖安装 | 复制客户端到临时目录 `npm install --ignore-scripts`（Node 25.9.0 / npm 11.12.1） | pass，526 个包 |
| 主进程构建 | `npm run build` | fail，`src/main/index.ts:22` TS2769/TS7006 |
| 渲染层类型 | `npx tsc -p tsconfig.json --noEmit` | pass |
| 渲染层打包 | `npx vite build` | pass，241 kB JS |
| 单元测试 | `npm test` | fail，No test files found |
| 单元测试（修正 root） | `npx vitest run --root .` | pass，3 文件 6 用例 |
| 源文件校验 | `source_manifest.json` 对比工作区 / git blob / zip | 0/33（CRLF）/ 33/33 / 33/33 |
| zip 与目录对比 | `unzip -Z1` 对比 `find` | 差异：2 个 `.env.example` |
| 上游信息 | 读取 Open-LLM-VTuber README 与 `routes.py` | MIT；Live2D 样例另有许可；`/client-ws`、`/asr`、`/tts-ws` |

未执行：Electron GUI 启动、`npm run package`、任何服务器登录。临时目录已删除，仓库内没有改动源码。

报告 v2 相对旧格式的变化：按 A1、A2、B、C 四条子线和三线程汇总；状态由验收项推导，而不是自报；新增接口矩阵、待决事项、风险表；测试结果附原始命令；不再用 `changed_files` 记录移动操作。
