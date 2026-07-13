# 人员职责

当前使用四人、三线程方案。1 号和 2 号人员计划书只细化线程 A 内部的两项工作；线程 B 仍由 3 号负责，线程 C 仍由 4 号负责。

## 1. 分工总览

| 线程 | 人员 | 核心职责 | 关键交付物 |
| --- | --- | --- | --- |
| A1 | 1 号 | 桌宠客户端、Live2D、音频播放和远端连接 | 可运行桌宠、客户端文档、A1 审计 |
| A2 | 2 号 | 角色包、Prompt、知识、表情动作规则和素材合规 | 可加载角色包、合规说明、A2 审计 |
| B | 3 号 | Orchestrator、WebSocket/API、LLM、会话和角色加载 | `/api/chat`、接口文档、B 审计 |
| C | 4 号 | TTS/ASR、Docker、四服务器部署、健康检查和备份 | 语音网关、部署说明、C 审计 |

## 2. 线程 A1，1 号：桌宠客户端与 Live2D

一句话说明：1 号负责让用户能在本地电脑上看到、操作和听到桌宠。

### A. 审计和启动桌宠

- 找到 `Open-LLM-VTuber` 的 Electron 客户端入口和桌宠模式。
- 记录启动方式、远端后端配置方式和 Live2D 加载路径。
- 说明哪些地方修改了上游代码、为什么修改以及怎样回滚。

完成标志：新人按 `docs/DESKTOP_PET_MODE.md` 能启动桌宠或得到明确、可复核的失败原因。

### B. 桌宠窗口和用户操作

- 支持透明、无边框、置顶、拖动和托盘菜单。
- 提供文字输入、语音入口、设置、错误提示和重试。
- 保存服务地址、模型路径、缩放、音量和透明度等本地设置。

完成标志：桌宠窗口可操作，服务不可用时客户端不崩溃。

### C. Live2D 表现

- 从 `character_pack/live2d-models/` 加载模型。
- 支持模型缩放、初始位置、默认表情、点击动作和口型同步。
- 按接口合同处理 `emotion` 和 `motion`。
- 表情不存在时回退 `neutral`；动作不存在时回退 `idle`。

完成标志：Mock 响应可以驱动字幕、音频、表情和动作，缺失模型时有清楚提示。

### D. 客户端通信和打包

- 连接 3 号提供的 VM-1 后端，支持 HTTP/WS 与 HTTPS/WSS 配置。
- 处理超时、断线提示和自动重连。
- 在 3 号后端未完成时使用 Mock 独立演示。
- 提供开发启动、构建、Windows 打包和角色切换说明。

主要交付物：

```text
docs/DESKTOP_PET_MODE.md
docs/LIVE2D_IMPORT.md
docs/TROUBLESHOOTING.md
audit/thread_a1_desktop_audit.md
audit/thread_a1_desktop_audit.json
```

## 3. 线程 A2，2 号：角色包与合规

一句话说明：2 号负责桌宠是谁、怎样说话、怎样表现，以及所用素材能否合法进入仓库。

### A. 角色包结构

- 建立 `characters/`、`prompts/`、`live2d-models/`、`voices/`、`backgrounds/` 和 `knowledge/`。
- 编写唯一的 `character_id`、模型名、Prompt 文件列表和默认表现。
- 确保路径有效，缺失内容有清楚说明。

完成标志：3 号后端可以按 `character_id` 加载角色，1 号客户端能找到对应 Live2D 配置。

### B. Prompt 和知识文件

- 编写 persona、语气风格、情绪规则、动作规则、直播边界和版权边界。
- 回复应简短、适合 TTS，称呼用户为“博士”。
- 不冒充官方角色，不声称代表鹰角、Yostar 或其他官方实体。
- 不大量复述官方剧情或输出未经授权的商业宣传。

完成标志：Prompt 可以按固定顺序拼接，并通过 Mock LLM 检查基本风格。

### C. 表情和动作规则

- 与 1 号确认模型实际支持的表情和动作。
- 与 3 号确认后端只返回合同中的固定值。
- 维护默认值和无法识别时的回退规则。

完成标志：角色 YAML、1 号映射和 3 号响应使用同一套枚举。

### D. 素材与声音合规

- 维护 `character_pack/ASSET_SOURCE_TABLE.md`。
- 编写角色包替换说明、许可证说明和声音政策。
- 不提交官方拆包资源、未授权角色语音或声优克隆音色。
- 商业直播、会员、广告或周边用途必须重新审核授权风险。

主要交付物：

```text
character_pack/characters/*.yaml
character_pack/prompts/*.md
character_pack/knowledge/*.md
character_pack/voices/voice_profile.json
character_pack/ASSET_SOURCE_TABLE.md
docs/CHARACTER_PACK_GUIDE.md
docs/LICENSE_NOTICE.md
docs/VOICE_POLICY.md
audit/thread_a2_character_audit.md
audit/thread_a2_character_audit.json
```

## 4. 线程 B，3 号：后端编排与 LLM

一句话说明：3 号负责系统的中枢大脑，接收客户端输入并组织统一回复。

### A. 后端结构和服务入口

- 审计上游后端入口、WebSocket handler、角色加载和各服务提供方配置。
- 建立 `server/orchestrator/` 和公共数据结构。
- 提供 `/api/health`、配置读取、日志和 Mock 模式。

完成标志：无 LLM Key、无 TTS 时也能启动并用 Mock 完成单轮对话。

### B. `/api/chat` 和 WebSocket

- 校验请求，管理 `session_id` 和基本会话历史。
- 按 `character_id` 加载 2 号角色包并拼接 Prompt。
- 调用 LLM 或 Mock LLM，解析 `emotion` 和 `motion`。
- 调用 4 号 TTS Gateway，向 1 号返回统一响应。

完成标志：接口输出符合 [`API_CONTRACT.md`](API_CONTRACT.md)，测试脚本能覆盖成功、非法输入和服务失败。

### C. 降级

- LLM 失败：返回固定兜底文字。
- TTS 失败：保留文字和表现字段，音频为空。
- 角色加载失败：使用明确错误或经全员确认的默认角色。
- 会话存储失败：不影响单轮对话。

主要交付物：

```text
server/orchestrator/
server/common/
docs/API_CONTRACT.md
docs/BACKEND_STRUCTURE.md
docs/ENV_CONFIG.md
scripts/test_chat_api.py
deploy/vm1-gateway/docker-compose.yml
audit/thread_b_orchestrator_audit.md
audit/thread_b_orchestrator_audit.json
```

## 5. 线程 C，4 号：语音服务与服务器部署

一句话说明：4 号负责远端语音能力和四台服务器可启动、可检查、可恢复的运行环境。

### A. TTS Gateway

- 提供 `/api/tts`、轻量或外部 TTS 提供方封装、音频缓存和过期清理。
- 同一输入可命中缓存；空文本和失败结果不缓存。
- TTS 全部失败时返回明确错误，由 3 号继续返回文字。

完成标志：VM-2 可独立返回 1 号客户端能够播放的音频，VM-4 可承担备用 TTS。

### B. ASR Gateway

- 提供 `/api/asr`，优先使用云端 API 代理、轻量方案或 Mock。
- 不在 1 GiB 服务器上强行运行重型 Whisper。
- ASR 失败时返回清楚错误，让 1 号切换文字输入。

完成标志：VM-3 能把测试音频转换为文字，或明确标注并验证 Mock 模式。

### C. Docker、健康检查和备份

- VM-1：Gateway + Orchestrator。
- VM-2：TTS Primary。
- VM-3：ASR Gateway。
- VM-4：Fallback + Backup + Healthcheck。
- 每个服务配置自动重启、健康检查、日志大小限制、明确端口和低内存参数。
- 提供安装、健康检查、配置备份和故障排查脚本。

完成标志：Docker Compose 可重复部署，健康检查能指出具体故障机器，备份不泄露凭据。

主要交付物：

```text
server/tts_gateway/
server/asr_gateway/
deploy/vm1-gateway/
deploy/vm2-tts/
deploy/vm3-asr/
deploy/vm4-fallback/
scripts/install_vm.sh
scripts/healthcheck.sh
scripts/backup_config.sh
docs/TTS_ASR_GUIDE.md
docs/SERVER_DEPLOYMENT.md
docs/TROUBLESHOOTING.md
audit/thread_c_voice_ops_audit.md
audit/thread_c_voice_ops_audit.json
```

## 6. 跨线程协作

| 协作内容 | 主导 | 配合 | 完成标志 |
| --- | --- | --- | --- |
| 角色配置和表现枚举 | 2 号 | 1 号、3 号 | YAML、客户端和后端名称一致 |
| `/api/chat` | 3 号 | 1 号、2 号、4 号 | 客户端能使用，角色和音频字段完整 |
| `/api/tts`、`/api/asr` | 4 号 | 3 号、1 号 | 后端能调用，客户端能播放或显示错误 |
| VM-1 部署 | 4 号负责部署 | 3 号提供服务 | 健康检查和回滚步骤可复现 |
| 完整 Demo | 全员 | 仓库拥有者确认 | 一轮文字和语音对话可重复完成 |
| 合规发布 | 2 号主导 | 全员 | 所有素材有来源，发布说明完整 |

## 7. 仓库拥有者

仓库拥有者负责：

- 保持 `main` 只包含已经审阅的内容。
- 确认每个 PR 属于 A1、A2、B 或 C，并邀请对应人员审阅。
- 处理跨线程优先级和接口冲突，不替参与者编造测试结果。
- 在合并前检查敏感信息、素材授权和回滚说明。
- 未经明确授权不自动合并 PR。

## 8. 边界规则

- 1 号和 2 号都属于线程 A，但职责不同：1 号做客户端，2 号做角色包。
- 2 号不接管线程 B 的后端编排，也不接管线程 C 的语音和服务器部署。
- 3 号不自行改变角色表现名称；4 号不自行改变 `/api/chat` 公共响应。
- 公共合同变更必须由四人确认后再合并。
- 每人只对实际完成和验证过的内容标记 `pass`。
