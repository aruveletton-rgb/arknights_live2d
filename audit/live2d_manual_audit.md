# Live2D 通用功能与用户需求人工审计

- 审计日期：2026-10-08
- 审计方式：在当前 Vite/Electron 开发服务运行期间，用 Playwright CLI 进行浏览器人工流程检查，并结合客户端自检与源码合同测试。
- 当前服务：`http://127.0.0.1:5173/`，页面标题 `Arknights VTuber Pet`，TCP 连接在审计结束时仍为成功。
- 运行配置：项目自有 `placeholder_operator` 占位资源，Mock LLM/TTS/ASR 开关可用；后端地址保留为 `http://127.0.0.1:8000`，本次未启动该端口的后端。
- 结论：占位角色和 Mock 客户端链路可人工演示；真实 Cubism Live2D、真实音频播放、VM-1/VM-2 HTTP/HTTPS 联调不应由本次结果推断为通过。

## 1. 审计范围与状态定义

本次按当前执行计划和用户已确认范围检查：客户端启动、模型资源加载、占位渲染、状态/表情/动作、文本对话、Mock 语音输入、字幕与音频降级、错误处理、设置持久化、无效模型回退和窗口尺寸适配。状态使用 `pass`、`partial`、`not_run`、`deferred`。

`pass` 仅表示本次有可复核证据；`partial` 表示占位或降级路径通过但完整能力未覆盖；`not_run` 表示当前服务条件不足或本次未执行；`deferred` 表示经用户确认留到后续阶段。

## 2. 逐项验收矩阵

| ID | 验收项 | 状态 | 本次证据 |
| --- | --- | --- | --- |
| L2D-01 | 客户端启动与页面可操作 | `pass` | `npm run dev` 完成构建，页面标题为 `Arknights VTuber Pet`；设置、输入和发送控件可见。 |
| L2D-02 | 占位模型配置加载 | `pass` | 浏览器请求 `/characters/placeholder_operator/placeholder.model3.json` 和 `/characters/placeholder_operator/model_dict.json` 均返回 HTTP 200。 |
| L2D-03 | 角色显示区域与占位渲染 | `partial` | DOM 存在 `.operator`、面部/身体结构和 `data-model-path`；这是 CSS/元数据占位角色，不是真实 Cubism 模型绘制。 |
| L2D-04 | 默认状态 | `pass` | 页面初始及恢复后均为 `data-state=idle`、`data-expression=neutral`、`data-motion=idle`，无模型警告。 |
| L2D-05 | 状态、表情、动作切换 | `pass` | Mock 输入 `a` 后出现回复，DOM 变为 `serious / sad / encourage`；等待回复时长后恢复 `idle / neutral / idle`。 |
| L2D-06 | Mock 文本对话与字幕 | `pass` | 输入“人工审计文本对话”后历史区保留用户消息和 Mock 回复；发送按钮在有文本时可用，忙碌期间禁用。 |
| L2D-07 | Mock 语音输入回填文本 | `pass` | 启用“语音输入”后按钮由 disabled 变为可用；点击后输入框回填“博士，今天有什么任务？”。这是 Mock 分支，不是麦克风采集。 |
| L2D-08 | 音频/字幕降级 | `partial` | Mock 回复的 `audio_url` 与 `audio_base64` 均为 null，字幕仍显示且页面不崩溃；真实音频文件播放未在本次服务中运行。 |
| L2D-09 | 后端不可达错误处理 | `pass` | 关闭 Mock 后请求 `http://127.0.0.1:8000/api/chat` 得到 `ERR_CONNECTION_REFUSED`；界面显示“无法连接后端服务，请确认 /api/chat 可访问。”并提供“重试”，随后恢复 Mock。 |
| L2D-10 | 设置保存与刷新恢复 | `pass` | 缩放从 1.00 调到 1.10，`--pet-scale` 和 `localStorage` 同步；刷新页面后仍为 1.10，Mock 和语音输入开关也保留。 |
| L2D-11 | 无效模型路径回退 | `pass` | 填入 `/characters/missing/missing.model3.json` 后显示“未找到 Live2D 模型，已切换到占位角色”；恢复合法路径后警告消失，页面仍可用。 |
| L2D-12 | 桌面/移动窗口布局 | `pass` | 390×844 与 1280×800 检查均满足 `scrollWidth=clientWidth`、`scrollHeight=clientHeight`，角色边界在视口内。 |
| L2D-13 | 合同外情绪/动作回退 | `pass` | `npm run selfcheck` 中 `tests/modelDict.test.ts` 与 `tests/stateMachine.test.ts` 通过；未知值回退规则为 `neutral` / `idle`。 |
| L2D-14 | 真实 HTTP/HTTPS LLM、TTS、ASR 联调 | `not_run` | 当前会话只保持前端开发服务；8000 后端未启动，因此未执行 VM-1/VM-2 间请求、主备 TTS 和 HTTPS 证书路径。 |
| L2D-15 | 正式 Live2D/Cubism 与音频口型 | `deferred` | 用户已确认继续项目自有占位资源；未提供正式模型授权、Cubism Core 分发许可或真实音频供应商凭据。 |
| L2D-16 | 两台 VM 生产部署和负载验收 | `not_run` | 本次未对远程 VM、Docker Compose、公网 HTTPS、资源峰值或 5 并发压力做操作；沿用既有计划中的两 VM 设计边界。 |

## 3. 验证命令与结果

| 命令/操作 | 结果 |
| --- | --- |
| `npm run dev`（客户端目录） | 运行中；Vite `127.0.0.1:5173` ready，Electron 窗口启动。 |
| Playwright `open`、`snapshot`、`eval` | 页面可操作；默认和恢复后的数据集状态符合合同。 |
| Playwright `requests` | 占位模型 JSON、字典 JSON HTTP 200；后端 `/api/chat` 明确记录连接拒绝。 |
| `npm run selfcheck` | 退出码 0；构建成功，5 个测试文件、13 个测试全部通过。 |
| `Test-NetConnection 127.0.0.1 -Port 5173` | `TcpTestSucceeded=True`。 |
| `git diff --check` | 无空白错误输出。 |

## 4. 当前运行状态与边界

- 审计结束时前端服务仍在运行，未停止用户要求保留的服务。
- 当前浏览器最终状态已恢复为 Mock、合法占位模型路径、`idle / neutral / idle`，无模型警告。
- 浏览器控制台发现两类可解释事件：开发环境 React DevTools 提示，以及缺失 `favicon.ico` 的 404；另有后端不可达时的 `ERR_CONNECTION_REFUSED`，与故障演练一致。
- 本报告不记录服务器公网 IP、订阅标识、令牌、Cookie 或其他敏感字段。

## 5. 未完成项与后续入口

1. 启动并联调 VM-1/VM-2 后，补做 `/api/chat`、`/api/tts`、`/api/asr`、健康检查、主备 TTS 和 HTTPS 验证。
2. 使用实际音频 fixture 验证 `AudioPlayer` 播放、播放失败后的字幕保留和口型驱动。
3. 用户提供合法授权的正式 Live2D 模型、许可和 Cubism Core 分发边界后，再做真实模型加载、表情动作和安装包审计。
4. 按既有计划执行远程 VM 资源峰值与 5 并发短请求验收；本次不把单浏览器通过结果当作容量保证。
