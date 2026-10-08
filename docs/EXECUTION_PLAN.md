# 整体执行计划书（MVP v2.0，已审计）

- 审计日期：2026-10-07
- 执行窗口：2026-10-08 至 2026-10-09
- 当前状态：第一阶段 MVP 关键链路、Electron 启动、客户端 ASR/TTS 回退和 5 分钟压力已完成验证；最终审计为 pass，正式 VM 私网互通、公网令牌配置和 VM-1 内存预留优化列为后续硬化
- 计划性质：当前唯一执行基线
- 历史参考：`docs/plans/PARALLEL_PLAN_2DAY_2VM.md`、`docs/plans/PARALLEL_PLAN_V1_6WEEK_4VM.md`

## 1. 审计结论

以下决策已由项目用户确认，直接作为本计划约束：

| 决策 | 已确认内容 | 影响 |
| --- | --- | --- |
| 目标 | 两天内完成可运行 MVP | 不以完整产品或生产发布为目标 |
| 时间 | 2026-10-08 开始，2026-10-09 结束 | 两日内闭环或明确标记未完成 |
| 执行方式 | 单人顺序执行 | 不按原三线程并行计划排期 |
| 拓扑 | 两台服务器，HTTP/HTTPS | VM-3、VM-4 不在本次范围内 |
| VM-1 | HTTPS、orchestrator、备用 TTS | 对外统一入口；本机 80/443 和 8080 被现有服务占用时使用 18080/18443 映射 |
| VM-2 | 主 TTS、ASR、健康检查 | 提供服务和状态检查 |
| 虚拟机规格 | 两台均为 Ubuntu 22.04、Standard B2ats v2、2 vCPU、1 GiB 内存 | 只运行轻量代理和 Mock 服务 |
| LLM | Mock LLM | 不依赖真实 LLM API Key |
| TTS / ASR | Mock TTS、Mock ASR | 验证真实 HTTP 链路和故障降级，真实供应商后续接入 |
| 依赖 | 允许联网安装 | 记录安装命令和版本，不提交依赖缓存 |
| 开发素材 | 合法免费样例 | 不提交官方素材、密钥或未授权音色 |
| 后置项 | 真实 Live2D、Windows 打包 | 本次只记录后续入口，不作为 MVP 通过条件 |

截图中的公网 IP、订阅 ID、资源组名称和其他云资源标识不写入仓库、计划书或审计报告；运行证据只记录脱敏后的 VM 名称和服务状态。

## 2. 当前基线

基线来自当前仓库内容和已有审计文件，不把计划目标当成现状：

| 项目 | 当前证据 | 状态 |
| --- | --- | --- |
| Git | `main` @ `97f6d062`，唯一已登记 worktree | 已完成 |
| 仓库结构 | 最新提交包含 90 个跟踪文件，根目录已完成结构扁平化 | 已完成 |
| 客户端历史审计 | `audit/thread_a1_desktop_audit.json` 记录原客户端原型为 `partial` | 历史部分可用 |
| 当前工作区 | 计划写入前曾存在 `upstream/Open-LLM-VTuber/client/` 下 35 个跟踪文件的未提交删除；已获用户授权并恢复 | 已复核，当前改动均为本次 MVP 实施 |
| API 合同 | `docs/API_CONTRACT.md` 已冻结为 Mock LLM/TTS/ASR 的 MVP v2.0 合同 | 已完成 |
| 后端 | `server/` 已有标准库 orchestrator、Mock TTS、Mock ASR 和共享 HTTP 工具 | 已完成并通过接口验证 |
| 部署 | `deploy/` 已有两套 Compose、Caddy HTTP/HTTPS 和脱敏环境样例 | 已部署；正式 VM 私网互通待补 |
| 角色包 | 只有目录说明和示例配置，没有正式模型或素材登记 | 后置/部分 |
| 最终审计 | `audit/final_integration_audit.md/json` 记录本轮实际命令和限制 | 已完成 |

执行第一步必须先保存当前 `git status --short`，确认客户端恢复只包含必要的 Git 跟踪文件；若复核发现源码仍缺失，MVP 的“客户端启动”标记为 `blocked`，不得用占位文件冒充实现。

## 3. MVP 目标与边界

### 3.1 必须交付

1. 客户端依赖可安装，主进程和渲染层可构建，客户端可启动到可操作界面。
2. 客户端通过 HTTP/HTTPS 调用 VM-1 的 `POST /api/chat`。
3. VM-1 使用 Mock LLM 返回 `session_id`、`character_id`、`text`、`emotion`、`motion`、`audio_url`、`error`。
4. VM-1 调用 VM-2 的 Mock TTS，返回可播放测试音频或明确的 `audio_url=null` 降级结果。
5. VM-2 暴露 Mock ASR HTTP 接口，样例音频可得到文本；ASR 失败时回到文本输入路径。
6. VM-1 能在主 TTS 不可用时调用备用 TTS；全部 TTS 不可用时仍返回字幕和错误对象。
7. VM-1、VM-2 可通过 Docker Compose 启动，并可按文档访问 HTTP/HTTPS 入口。
8. 健康检查能区分 orchestrator、主 TTS、备用 TTS、ASR 的正常和失败状态。
9. 生成 `audit/final_integration_audit.md` 与 `audit/final_integration_audit.json`，逐项记录证据、命令、结果和未完成项。

### 3.2 明确排除

- 真实 LLM、真实 TTS、真实 ASR 供应商接入。
- 真实 Live2D Cubism 模型渲染、表情动作播放和音频驱动口型。
- Windows 安装包和 `npm run package` 的通过性。
- 四服务器拓扑、VM-3/VM-4 独立部署、生产级公网发布。
- 官方游戏素材、官方角色语音、声优克隆音色和任何凭据文件。

排除项在审计中标记为 `deferred`，不得写成 `fail` 或 `pass`。

## 4. 两台 VM 的负载设计

### 4.1 资源约束

每台 VM 的可用规格是 2 vCPU、1 GiB 内存。Ubuntu、SSH、Docker daemon、日志和文件缓存必须预留资源，因此容器不能按 1 GiB 全额使用。

| VM | 服务 | 容器内存上限建议 | 设计 CPU 上限 | 说明 |
| --- | --- | ---: | ---: | --- |
| VM-1 | HTTPS 入口、orchestrator、Mock LLM、备用 TTS | 560 MiB 合计 | 1.5 vCPU 合计 | 每次只处理轻量 JSON 编排和小型测试音频 |
| VM-2 | 主 Mock TTS、Mock ASR、健康检查 | 500 MiB 合计 | 1.5 vCPU 合计 | 不加载本地模型，不做音频长时转码 |

两台 VM 都保留至少约 250 MiB 给系统和 Docker。实际峰值必须用 `free -m`、`docker stats --no-stream` 和请求压测记录；未实测数字不得写成容量保证。

### 4.2 MVP 支持范围

这是本次演示的设计容量，不是生产 SLA：

| 指标 | 目标范围 | 超出处理 |
| --- | --- | --- |
| 同时进行的聊天请求 | VM-1 最多 2 个 | 第 3 个排队或返回 `BUSY` |
| 同时 TTS/ASR 请求 | VM-2 最多 2 个 | 返回 429 或进入短队列 |
| 全链路持续请求 | 约 0.2 req/s（每分钟 12 次） | 降低频率并记录拒绝 |
| 单次测试音频 | 不超过 30 秒、5 MiB | 413 拒绝 |
| 单会话速率 | 不超过 10 次/分钟 | 429 拒绝 |
| 演示用户数 | 1 个活跃用户，最多 3 个短时并发连接 | 不承诺多人生产使用 |
| 健康检查 | 每服务 30 秒一次 | 不得与业务请求争抢全部 CPU |

MVP 的压力校验为 5 个并发短请求、持续 5 分钟；验收记录 P95 响应时间、错误数、CPU 峰值和内存峰值。若任一 VM 内存达到 850 MiB、出现 OOM、连续 3 次超时或 CPU 持续超过 85%，即判为超出设计范围，停止增加并发并记录降级结果。

### 4.3 不允许的负载

- 在任一 VM 上运行本地 LLM、Whisper 等常驻模型或重型 TTS。
- 把完整音频文件长期缓存在内存中；Mock 音频应使用小型固定 fixture 或短时文件。
- 将 Docker、Caddy、健康检查和业务容器设置为无上限运行。
- 以单次成功请求推断长期稳定性；必须记录连续请求和资源峰值。

## 5. MVP 接口冻结

正式内容写入 `docs/API_CONTRACT.md`，客户端、orchestrator、TTS、ASR 使用同一份样例。

### 5.1 `POST /api/chat`

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "input_type": "text",
  "text": "今天有点累。",
  "enable_tts": true
}
```

成功响应：

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "text": "博士，先休息一下吧。",
  "emotion": "worried",
  "motion": "idle",
  "audio_url": "http://vm1-or-vm2/mock-audio/demo.wav",
  "error": null
}
```

错误响应保留同一外层结构，`error` 使用 `{ "code": "SERVICE_UNAVAILABLE", "message": "..." }`；不再新增 `reply_text` 作为主字段。

### 5.2 其他接口

| 接口 | 用途 | MVP 验收 |
| --- | --- | --- |
| `GET /api/health` | VM-1 服务状态 | 返回 `status` 及 `llm`、`tts`、`asr` 状态 |
| `GET /api/characters` | 返回默认角色元数据 | 至少返回 `arknights_fan_001` |
| `POST /api/tts` | VM-2 Mock TTS | 返回测试音频 URL、provider 和 cache 状态 |
| `POST /api/asr` | VM-2 Mock ASR | 样例输入返回文本；故障返回标准错误 |

情绪和动作沿用合同枚举；客户端未知值回退到 `neutral` / `idle`。MVP 不要求真实 Live2D 播放，但要覆盖字段解析测试。

## 6. 两日执行顺序

### 6.1 2026-10-08：基线、合同和服务骨架

| 时间段 | 任务 | 交付物 | 验证证据 |
| --- | --- | --- | --- |
| 上午 | 保存当前状态；确认客户端文件删除是否保留；联网安装依赖；修复构建和测试入口 | 可复核的状态快照 | `git status`、安装、构建、测试原始输出 |
| 上午 | 冻结 MVP 合同；准备请求、成功、TTS 失败、ASR 失败样例 | `docs/API_CONTRACT.md` 和 fixtures | JSON 校验或等价脚本输出 |
| 下午 | 实现 VM-2 Mock TTS/ASR 和健康接口 | `server/tts_gateway/`、`server/asr_gateway/` | 正常、非法、停止服务测试 |
| 下午 | 实现 VM-1 orchestrator、Mock LLM、默认角色、主备 TTS 和统一错误 | `server/orchestrator/` | `/api/chat`、`/api/health`、主备切换记录 |
| 收尾 | 写 VM-1/VM-2 Compose 和脱敏 `.env.example` | `deploy/` 配置 | `docker compose config` 或等价检查 |

### 6.2 2026-10-09：客户端、演练和审计

| 时间段 | 任务 | 交付物 | 验证证据 |
| --- | --- | --- | --- |
| 上午 | 客户端接入合同；显示 `text`；播放 Mock 音频；处理 `audio_url=null`；ASR 失败回到文本 | 客户端接口对齐 | 文本、音频、TTS 失败、ASR 失败记录 |
| 上午 | 配置共享令牌和 HTTP/HTTPS 本地入口；不把令牌写入仓库 | 非敏感配置和部署说明 | 无令牌拒绝、有效令牌成功 |
| 下午 | 启动两台 VM；执行健康检查；依次停止主 TTS、ASR、orchestrator | 运行中的演示环境 | 健康检查、故障响应、客户端降级证据 |
| 下午 | 执行 5 并发短请求压力校验；生成 MD/JSON 最终审计 | `audit/final_integration_audit.md/json` | 两份报告结论、状态和证据一致 |

若 10 月 8 日结束时客户端构建或合同仍未通过，10 月 9 日优先修复阻塞项；不得先扩展 Live2D 或真实供应商能力。

## 7. 任务清单与完成标准

| ID | 任务 | 完成标准 |
| --- | --- | --- |
| MVP-01 | 当前状态和删除项审计 | 保留 `git status` 证据；删除项有明确结论 |
| MVP-02 | 客户端依赖和构建修复 | `npm run build` 成功；若源码删除未恢复则记录 `blocked` |
| MVP-03 | 客户端测试入口修复 | `npm test` 找到并运行现有测试 |
| MVP-04 | API 合同冻结 | 合同、fixtures、客户端字段一致 |
| MVP-05 | Mock LLM | 无 Key 返回稳定合同响应 |
| MVP-06 | Mock TTS | 返回可播放测试音频；异常返回标准错误 |
| MVP-07 | Mock ASR | 样例请求返回文本；异常可识别 |
| MVP-08 | orchestrator 编排 | chat → LLM → TTS，主备和全失败路径可复现 |
| MVP-09 | 客户端接入 | 文本、字幕、音频、TTS/ASR 降级完成 |
| MVP-10 | 两台 Compose | 两台配置可解析并能启动 |
| MVP-11 | 健康检查 | 覆盖四个逻辑服务，输出状态和失败目标 |
| MVP-12 | 负载边界验证 | 5 并发短请求，记录 CPU、内存、P95 和错误数 |
| MVP-13 | 最终审计 | MD/JSON 一一对应，所有未执行项写明原因 |

## 8. 验收矩阵

| 编号 | 验收项 | 通过证据 |
| --- | --- | --- |
| AC-MVP-01 | 客户端启动 | 构建输出和启动日志/截图 |
| AC-MVP-02 | 客户端调用 VM-1 文本对话 | 请求与响应原始记录 |
| AC-MVP-03 | Mock LLM 返回合同字段 | API 测试输出 |
| AC-MVP-04 | Mock TTS 生成并播放测试音频 | 音频响应与播放记录 |
| AC-MVP-05 | Mock ASR 返回文本 | 样例请求响应记录 |
| AC-MVP-06 | TTS 失败时保留字幕 | 停止主/备 TTS 后的响应和界面记录 |
| AC-MVP-07 | ASR 失败时回到文本输入 | 故障响应和客户端记录 |
| AC-MVP-08 | 主 TTS → 备用 TTS 切换 | VM-2 故障演练输出 |
| AC-MVP-09 | 健康检查定位故障 | 健康检查命令输出 |
| AC-MVP-10 | 两台 Compose 可部署 | 配置检查和启动日志 |
| AC-MVP-11 | HTTP/HTTPS 入口可访问 | curl 或浏览器请求记录 |
| AC-MVP-12 | 负载在设计范围内 | 5 并发压力输出和资源峰值 |
| AC-MVP-13 | 审计报告完整 | `audit/final_integration_audit.md/json` |

状态只能使用：`pass`、`partial`、`fail`、`not_run`、`blocked`、`deferred`。没有原始证据不得标记 `pass`。

## 9. 审计输出

最终报告至少包含：

- Git 提交、工作区状态和实际修改文件；
- 安装、构建、测试、Compose、健康检查、接口调用和压力校验命令；
- AC-MVP-01 至 AC-MVP-13 的状态和证据路径；
- TTS/ASR 主备与失败降级结果；
- 两台 VM 的 CPU、内存、P95、错误数和超载判定；
- 未完成项、阻塞原因和下一阶段建议；
- 依赖版本、运行环境和是否使用外部服务；
- 敏感字段脱敏确认。

MD 与 JSON 必须共享同一结论。不得记录密钥、服务器地址、Cookie、完整令牌或个人隐私。

## 10. 后续路线

MVP 通过后再建立后续计划，不把后续内容混入本次验收：

1. 接入合法授权的 Live2D 模型、`model_dict.json`、表情动作和音频驱动口型。
2. 接入真实 TTS/ASR 供应商并记录授权、成本和限额。
3. 完善会话管理、自动重连、限流、生产 HTTPS 和公网安全策略。
4. 实现 Windows 打包、安装测试和非技术用户安装文档。
5. 根据实际资源决定是否恢复四服务器拓扑。

后续每项开始前，都要更新本计划或新建带版本号的计划，并重新生成审计证据。

## 11. 第二阶段执行计划：角色包与 Live2D 占位增强

- 版本：Phase 2 / placeholder-track，审计日期：2026-10-08
- 启动依据：第一阶段 MVP 的客户端、Mock LLM、Mock TTS/ASR、降级、HTTP/HTTPS 和审计链路已完成；用户已选择“角色包与 Live2D 占位增强”为下一条主线。
- 当前状态：代码和开发元数据已落地，客户端自检通过；真实 Live2D 仍为 `deferred`。

### 11.1 已审计决策

| 决策 | 结论 | 计划影响 |
| --- | --- | --- |
| 目标窗口 | 继续沿用 2026-10-08 至 2026-10-09 的两日 MVP 窗口 | 第二阶段只做可运行占位增强和可验证合同，不扩展生产拓扑 |
| 服务器职责 | VM-1：HTTPS + orchestrator + 备用 TTS；VM-2：主 TTS + ASR + 健康检查 | 角色资源由客户端静态目录消费，不新增 VM |
| 服务来源 | Mock LLM/TTS/ASR；真实供应商后续接入 | 不把供应商凭据或音色加入角色包 |
| 合规边界 | 允许联网安装依赖；使用合法免费样例和项目自有占位素材 | 禁止官方素材、未授权音色、密钥和 Cubism Core 入库 |
| 执行方式 | 单人顺序执行 | 依赖顺序为字典合同 → 客户端校验 → 角色元数据 → 构建审计 |
| 当前主线 | 角色包与 Live2D 占位增强 | 本阶段验收不要求真实 Live2D 绘制 |

### 11.2 本阶段交付

1. `model_dict.json` 合同表、严格校验、表情映射和动作映射。
2. 未知表情回退 `neutral`，未知动作回退 `idle`；状态机不再产生合同外值。
3. `placeholder_operator` 模型元数据和 `arknights_fan_001` 角色 YAML。
4. 素材来源登记和开发期合规说明。
5. 客户端构建、测试和占位资源打包验证。
6. `audit/phase2_live2d_audit.{md,json}`，记录命令、状态和未决项。

### 11.3 执行顺序与验收

| 顺序 | 工作 | 证据 | 状态 |
| --- | --- | --- | --- |
| 1 | 冻结模型字典字段和值域 | `modelDict.ts`、角色包 JSON | `pass` |
| 2 | 修复状态机合同外值 | `CharacterStateMachine.ts`、状态机测试 | `pass` |
| 3 | 实现模型字典校验和映射测试 | `tests/modelDict.test.ts` | `pass` |
| 4 | 构建并运行客户端测试 | `npm run selfcheck` | `pass` |
| 5 | 校验构建产物包含占位 JSON | `dist/renderer/characters/...` | `pass`，模型 JSON 和字典均已复制 |
| 6 | 审计正式模型授权和安装包范围 | 用户确认记录 | `deferred`，未获确认前不执行 |

### 11.4 资源与风险约束

- 沿用两台 VM 的负载范围：VM-1 合计容器上限约 560 MiB、VM-2 约 500 MiB；本阶段不在服务器运行 Live2D 或音频模型。
- 占位资源仅为小型 JSON 和 CSS，不能据此推断正式模型的 GPU、内存或安装包容量需求。
- 不修改 Azure VNet/NSG、DNS、公网证书、系统防火墙或 VM 数量；这些事项必须单独审计确认。

### 11.5 用户审计门槛

以下事项在用户明确确认前保持 `deferred`，不写成已完成：正式模型是否获授权、许可是否允许再分发、是否进入 Windows 安装包、是否引入 Cubism Core、正式模型体积和目标设备资源预算。

## 12. 剩余阶段执行结果与边界（2026-10-08）

用户已审计确认：继续使用项目自有占位资源；继续使用 Mock TTS/ASR 并完成部署硬化；保持两台 VM，不修改 Azure VNet/NSG、DNS、公网证书或 VM 数量。按此边界，剩余工作分为“可执行收尾”和“外部条件未满足的后续阶段”：

| 阶段 | 工作 | 当前状态 | 证据/原因 |
| --- | --- | --- | --- |
| Phase 3 | Windows 未签名开发安装包 | `pass` | `npm run package:dev` 生成 `release/Arknights VTuber Pet Setup 0.1.0.exe` |
| Phase 3 | 两台 Compose 配置、环境变量门禁、回滚文档 | `pass` | `docker compose config`、`scripts/validate_deployment.py` 和 `docs/SERVER_DEPLOYMENT.md` |
| Phase 3 | 生产域名、非空令牌和实际 VM 私网地址 | `not_run` | 当前未提供真实值；生产校验会拒绝 `localhost`、占位 URL 和空令牌 |
| Phase 4 | 正式 Live2D/Cubism | `deferred` | 用户确认继续项目自有占位；没有授权模型、许可文本和 Core 分发确认 |
| Phase 5 | 真实 TTS/ASR | `deferred` | 用户确认继续 Mock；没有供应商选择、凭据和费用/限额审计 |
| Phase 6 | 四 VM 拓扑扩展 | `deferred` | 用户确认保持两台 VM |

因此，当前计划范围内可执行的阶段已完成；后三项不是失败，而是经用户审计后明确保留的后续入口。任何重新开启都必须先更新本节并重新审计资源、授权、凭据和验收标准。
