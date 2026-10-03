# Arknights Desktop Pet VTuber

基于 `Open-LLM-VTuber` 构建的非官方同人桌宠 VTuber 项目。

本项目目标是制作一个可在本地电脑运行的 Live2D 桌宠角色，并通过远端轻量服务器提供 LLM 编排、语音合成、语音识别、缓存、健康检查等服务。

> 重要说明：本项目是非官方同人项目，不隶属于、不代表、不声称获得《明日方舟》、鹰角网络、Yostar 或任何相关官方实体授权。项目不应包含未授权官方素材、官方角色语音、声优克隆音色或可造成官方误认的商业宣传内容。

---

## 1. 项目目标

本项目最终实现：

1. 本地运行 Electron 桌宠客户端。
2. 桌宠加载 Live2D 模型。
3. 用户可通过文本或语音与桌宠对话。
4. 桌宠可调用 LLM 生成符合角色设定的回复。
5. 桌宠可通过 TTS 播放语音。
6. Live2D 可根据回复内容切换表情和动作。
7. 后端可部署到 4 台轻量服务器上。
8. 服务异常时具备降级能力，不让桌宠直接崩溃。
9. 项目结构清晰，方便后续替换角色包、音色、模型和服务器配置。

---

## 2. 总体架构

```text
本地电脑
  ├─ Electron 桌宠客户端
  ├─ Live2D 模型渲染
  ├─ 麦克风输入
  ├─ 音频播放
  └─ 字幕 / 输入框 / 鼠标交互

远端服务器
  ├─ VM-1：Gateway + Orchestrator
  ├─ VM-2：TTS Primary
  ├─ VM-3：ASR Gateway
  └─ VM-4：Fallback + Backup + Healthcheck
```

交互流程：

```text
用户输入文本或语音
  ↓
本地桌宠客户端
  ↓
远端 Orchestrator
  ↓
角色 Prompt + LLM
  ↓
TTS Gateway
  ↓
返回文本、语音、表情、动作
  ↓
桌宠播放语音并驱动 Live2D
```

---

## 3. 技术路线

本项目基于以下思路构建：

```text
Open-LLM-VTuber
  +
明日方舟风格非官方同人角色包
  +
Live2D 模型
  +
角色 Prompt
  +
TTS / ASR 网关
  +
远端轻量后端部署
  +
本地 Electron 桌宠模式
```

其中：

* `Open-LLM-VTuber` 负责基础 VTuber 能力。
* `character_pack` 负责角色配置、Prompt、Live2D、表情动作、知识文件。
* `server/orchestrator` 负责对话编排、LLM 调用、会话状态。
* `server/tts_gateway` 负责语音合成。
* `server/asr_gateway` 负责语音识别。
* `deploy` 负责 4 台服务器部署。
* `docs` 负责部署、使用、合规和故障排查文档。

---

## 4. 推荐仓库结构

```text
arknights-desktop-pet-vtuber/
├─ upstream/
│  └─ Open-LLM-VTuber/
│
├─ character_pack/
│  ├─ characters/
│  ├─ prompts/
│  ├─ live2d-models/
│  ├─ voices/
│  ├─ backgrounds/
│  └─ knowledge/
│
├─ server/
│  ├─ orchestrator/
│  ├─ tts_gateway/
│  ├─ asr_gateway/
│  └─ common/
│
├─ deploy/
│  ├─ vm1-gateway/
│  ├─ vm2-tts/
│  ├─ vm3-asr/
│  └─ vm4-fallback/
│
├─ scripts/
│  ├─ install_vm.sh
│  ├─ healthcheck.sh
│  ├─ backup_config.sh
│  └─ update_all.sh
│
├─ docs/
│  ├─ DESKTOP_PET_MODE.md
│  ├─ CHARACTER_PACK_GUIDE.md
│  ├─ SERVER_DEPLOYMENT.md
│  ├─ API_CONTRACT.md
│  ├─ TTS_ASR_GUIDE.md
│  ├─ LICENSE_NOTICE.md
│  ├─ VOICE_POLICY.md
│  └─ TROUBLESHOOTING.md
│
├─ audit/
│  ├─ thread_a_audit.json
│  ├─ thread_b_audit.json
│  ├─ thread_c_audit.json
│  └─ final_integration_audit.json
│
├─ .env.example
└─ README.md
```

---

## 5. 服务器规划

当前规划使用 4 台轻量服务器：

```text
4 × Standard B2ats v2
每台：2 vCPU / 1 GiB 内存
```

由于服务器配置较低，本项目不建议在这些服务器上部署大型 LLM、大型 ASR 模型或重型 TTS 模型。

推荐职责如下：

| 服务器  | 角色                     | 职责                                  |
| ---- | ---------------------- | ----------------------------------- |
| VM-1 | Gateway + Orchestrator | 统一入口、WebSocket/API、角色 Prompt、LLM 编排 |
| VM-2 | TTS Primary            | 主语音合成服务、音频缓存                        |
| VM-3 | ASR Gateway            | 语音识别网关或云端 ASR 代理                    |
| VM-4 | Fallback + Backup      | 备用 TTS、健康检查、配置备份、日志备份               |

---

## 6. 本地电脑职责

本地电脑负责桌宠本体运行：

```text
1. Electron 桌宠客户端
2. Live2D 渲染
3. 麦克风采集
4. 音频播放
5. 字幕显示
6. 鼠标交互
7. 桌宠窗口置顶、透明背景、拖动、缩放
```

桌宠本体不应部署在服务器上，因为桌宠需要显示在用户本地桌面。

---

## 7. 后端职责

后端负责：

```text
1. 接收桌宠客户端请求
2. 加载角色配置
3. 拼接角色 Prompt
4. 调用 LLM
5. 解析 emotion / motion
6. 调用 TTS Gateway
7. 返回桌宠所需响应
8. 记录会话状态
9. 提供健康检查
10. 支持服务降级
```

标准响应格式：

```json
{
  "session_id": "demo-session",
  "character_id": "arknights_fan_001",
  "text": "博士，今天也辛苦了。",
  "emotion": "smile",
  "motion": "greeting",
  "audio_url": "https://example.com/cache/xxx.wav",
  "error": null
}
```

---

## 8. 角色包说明

角色包位于：

```text
character_pack/
```

推荐结构：

```text
character_pack/
├─ characters/
│  └─ arknights_fan_001.yaml
├─ prompts/
│  ├─ persona.md
│  ├─ speech_style.md
│  ├─ emotion_rules.md
│  ├─ livestream_rules.md
│  └─ copyright_boundary.md
├─ live2d-models/
├─ voices/
├─ backgrounds/
└─ knowledge/
```

角色配置示例：

```yaml
character_id: arknights_fan_001
character_name: Rhodes Fan Operator
display_name: 罗德岛风格同人桌宠
human_name: 博士
live2d_model_name: arknights_fan_model
avatar: character_pack/avatars/arknights_fan.png

prompt_files:
  - character_pack/prompts/persona.md
  - character_pack/prompts/speech_style.md
  - character_pack/prompts/emotion_rules.md
  - character_pack/prompts/copyright_boundary.md

default_emotion: neutral
default_motion: idle

allowed_emotions:
  - neutral
  - smile
  - serious
  - worried
  - sad
  - surprised
  - thinking
  - confident

allowed_motions:
  - idle
  - greeting
  - nod
  - shake
  - think
  - encourage
  - battle_ready
```

---

## 9. 表情和动作规范

后端返回的表情字段：

```text
neutral
smile
serious
worried
sad
surprised
thinking
confident
```

后端返回的动作字段：

```text
idle
greeting
nod
shake
think
encourage
battle_ready
```

客户端必须实现回退策略：

```text
未知 emotion → neutral
未知 motion → idle
无 audio_url → 只显示字幕，不播放语音
后端断线 → 自动重连或提示用户
```

---

## 10. TTS 语音策略

MVP 阶段推荐使用：

```text
Edge TTS / Azure TTS / OpenAI-compatible TTS / 其他合法授权 TTS API
```

不建议直接使用：

```text
1. 未授权官方角色语音
2. 未授权声优克隆音色
3. 游戏内提取语音
4. 来源不明的角色声音模型
```

语音服务接口：

```text
POST /api/tts
```

请求示例：

```json
{
  "text": "博士，今天也辛苦了。",
  "voice_id": "arknights_fan_default",
  "emotion": "smile",
  "speed": 1.0
}
```

响应示例：

```json
{
  "audio_url": "https://example.com/cache/abc.wav",
  "duration_ms": 2800,
  "provider": "edge_tts",
  "cache_hit": false
}
```

---

## 11. ASR 语音识别策略

语音识别可选两种方案：

### 方案 A：本地 ASR

适合隐私优先、延迟优先的用户。

```text
本地电脑完成语音识别，只把识别后的文字发给服务器。
```

### 方案 B：远端 ASR Gateway

适合统一部署和集中管理。

```text
本地上传音频到 VM-3，VM-3 调用云端 ASR 或轻量 ASR 服务。
```

接口：

```text
POST /api/asr
```

响应示例：

```json
{
  "text": "博士，今天有什么任务？",
  "provider": "cloud_asr",
  "confidence": 0.91
}
```

---

## 12. LLM 策略

当前 4 台服务器配置较低，不建议部署本地大模型。

推荐方案：

```text
1. 使用 OpenAI-compatible API
2. 使用 DeepSeek-compatible API
3. 使用 Gemini-compatible API
4. 使用用户本地电脑上的 Ollama / LM Studio
5. 使用 mock LLM 进行无密钥测试
```

环境变量示例：

```env
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.example.com/v1
LLM_API_KEY=replace_me
LLM_MODEL=replace_me
```

---

## 13. 快速开始

### 13.1 克隆项目

```bash
git clone <your-repo-url>
cd arknights-desktop-pet-vtuber
```

如果使用 `Open-LLM-VTuber` 作为 submodule：

```bash
git submodule update --init --recursive
```

### 13.2 准备环境变量

复制配置模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.example.com/v1
LLM_API_KEY=replace_me
LLM_MODEL=replace_me

TTS_GATEWAY_URL=http://localhost:8082
ASR_GATEWAY_URL=http://localhost:8083

CHARACTER_ID=arknights_fan_001
```

### 13.3 启动后端编排服务

```bash
cd server/orchestrator
python app.py
```

或使用 Docker：

```bash
cd deploy/vm1-gateway
docker compose up -d
```

### 13.4 启动 TTS 服务

```bash
cd deploy/vm2-tts
docker compose up -d
```

### 13.5 启动 ASR 服务

```bash
cd deploy/vm3-asr
docker compose up -d
```

### 13.6 启动桌宠客户端

进入 `Open-LLM-VTuber` 客户端目录，按照其官方方式启动 Electron 客户端。

桌宠客户端应配置连接到：

```text
http://localhost:12393
```

或远端：

```text
https://your-vm1-domain.example.com
```

---

## 14. 4 台服务器部署流程

### VM-1：Gateway + Orchestrator

```bash
cd deploy/vm1-gateway
cp .env.example .env
docker compose up -d
```

### VM-2：TTS Primary

```bash
cd deploy/vm2-tts
cp .env.example .env
docker compose up -d
```

### VM-3：ASR Gateway

```bash
cd deploy/vm3-asr
cp .env.example .env
docker compose up -d
```

### VM-4：Fallback + Backup

```bash
cd deploy/vm4-fallback
cp .env.example .env
docker compose up -d
```

### 健康检查

```bash
bash scripts/healthcheck.sh
```

---

## 15. 降级策略

项目必须保证服务异常时桌宠不崩溃。

推荐降级逻辑：

```text
LLM 失败
  → 返回预设兜底回复

TTS 失败
  → 返回文字和表情，但 audio_url=null

ASR 失败
  → 切换到文本输入

VM-2 TTS 失败
  → 切换 VM-4 fallback TTS

WebSocket 断开
  → 客户端自动重连

Live2D 表情不存在
  → 回退 neutral

Live2D 动作不存在
  → 回退 idle
```

兜底回复示例：

```text
博士，通讯似乎有些不稳定。不过我还在这里。
```

---

## 16. 多人开发分工

本项目建议由 4 个人通过 Codex 并行开发，分为 3 条线程。

```text
线程 A：桌宠客户端 + Live2D + 角色包
负责人：人员 1、人员 2

线程 B：服务端编排 + WebSocket/API + LLM
负责人：人员 3

线程 C：TTS/ASR 语音服务 + 服务器部署
负责人：人员 4
```

推荐分支：

```text
main
develop
thread-a-desktop
thread-a-character
thread-b-orchestrator
thread-c-voice-ops
```

合并顺序：

```text
1. thread-a-character → develop
2. thread-c-voice-ops → develop
3. thread-b-orchestrator → develop
4. thread-a-desktop → develop
5. develop 测试通过后 → main
```

---

## 17. 审计报告要求

每个线程完成后必须提交审计 JSON。

示例：

```json
{
  "thread": "thread-b-orchestrator",
  "owner": "person-3",
  "status": "pass",
  "changed_files": [],
  "added_files": [],
  "deleted_files": [],
  "tests": [
    {
      "name": "chat_api_test",
      "command": "python scripts/test_chat_api.py",
      "result": "pass"
    }
  ],
  "risks": [],
  "open_items": [],
  "next_steps": []
}
```

最终需要提交：

```text
audit/final_integration_audit.json
```

---

## 18. 最终验收标准

项目最终验收时，需要满足：

```text
1. 本地 Electron 桌宠可启动。
2. 桌宠可连接远端 VM-1。
3. 桌宠可加载 Live2D 模型。
4. 用户文本输入可获得角色回复。
5. 用户语音输入可获得角色回复。
6. TTS 可生成并播放语音。
7. Live2D 可根据 emotion 切换表情。
8. Live2D 可根据 motion 播放动作。
9. TTS 失败时可只显示字幕。
10. ASR 失败时可切换文本输入。
11. WebSocket 断开后可重连。
12. 两台服务器可通过 Docker Compose 部署。
13. 健康检查脚本可定位服务状态。
14. 文档完整。
15. 合规说明完整。
16. 非技术用户可按照文档完成基本部署和使用。
```

---

## 19. 合规说明

本项目必须遵守以下原则：

```text
1. 不包含未授权官方游戏资源。
2. 不包含未授权官方角色语音。
3. 不包含未授权声优克隆音色。
4. 不声称本项目为官方项目。
5. 不声称代表鹰角网络、Yostar 或任何官方实体。
6. 不将官方素材作为开源仓库内容发布。
7. 所有素材必须记录来源。
8. 商业直播、广告、会员付费、周边售卖等场景需要重新审查授权风险。
```

相关说明文件：

```text
docs/LICENSE_NOTICE.md
docs/VOICE_POLICY.md
character_pack/ASSET_SOURCE_TABLE.md
```

---

## 20. 常见问题

### Q1：这 4 台服务器能不能跑大语言模型？

不建议。每台服务器只有 2 vCPU / 1 GiB 内存，更适合做网关、TTS/ASR API 代理、缓存、健康检查和轻量编排。

### Q2：桌宠能不能直接部署在服务器上？

不建议。桌宠需要显示在用户本地桌面，因此 Electron 客户端和 Live2D 渲染应运行在本地电脑。

### Q3：可以使用明日方舟官方角色语音吗？

不建议。除非拥有明确授权，否则不要使用官方角色语音、声优克隆音色或从游戏中提取的语音素材。

### Q4：可以直接使用官方立绘做 Live2D 吗？

公开发布或商业使用不建议。建议使用自制或授权的同人 Live2D 模型。

### Q5：没有 LLM API Key 能不能测试？

可以。后端应提供 mock LLM 模式，用于测试桌宠、TTS、表情动作和接口链路。

---

## 21. 后续开发路线

```text
Phase 1：跑通 Open-LLM-VTuber 桌宠模式
Phase 2：接入远端 VM-1 后端
Phase 3：接入 VM-2 TTS Gateway
Phase 4：接入 VM-3 ASR Gateway
Phase 5：接入 VM-4 fallback 和 healthcheck
Phase 6：接入明日方舟风格角色包
Phase 7：优化 Live2D 表情、动作和语音体验
Phase 8：完善部署文档、合规文档和最终审计报告
```

---

## 22. 当前状态

当前项目处于设计和任务拆分阶段。

待完成：

```text
1. 初始化仓库结构
2. 引入 Open-LLM-VTuber
3. 编写 API_CONTRACT.md
4. 创建 character_pack 初版
5. 创建 orchestrator 初版
6. 创建 tts_gateway 初版
7. 创建 asr_gateway 初版
8. 创建 4 台服务器部署模板
9. 创建桌宠启动文档
10. 完成第一次集成测试
```

---

## 23. 许可证与声明

本项目代码部分的许可证需要根据实际仓库选择并明确声明。

注意：

```text
Open-LLM-VTuber 的代码许可证不等于本项目角色素材、Live2D 模型、音色、背景图和 Prompt 的授权。
```

请在发布前补充：

```text
1. 本项目代码许可证
2. 上游项目许可证说明
3. Live2D 模型授权说明
4. 音色授权说明
5. 背景图授权说明
6. 明日方舟同人合规说明
```

---

## 24. 维护建议

建议所有新增功能都遵循：

```text
1. 先更新 docs/API_CONTRACT.md
2. 再更新代码
3. 再补充测试
4. 最后输出 audit JSON
```

不要直接修改公共接口，除非所有线程负责人确认。
