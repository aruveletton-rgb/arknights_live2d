# 线程 A1 验收缺口报告

| 计划书要求 | 状态 | 依据 / 缺口 |
|---|---|---|
| 找到 Electron 客户端入口 | 通过 | `src/main/index.ts` |
| 找到桌宠模式切换逻辑 | 部分 | 启动即桌宠，没有模式切换 |
| 远端 backend 配置 | 部分 | 设置面板 + localStorage；仅 HTTP/HTTPS |
| 支持 http/ws 和 https/wss | 未通过 | 没有 WebSocket 客户端 |
| 连接失败提示 | 通过 | `ChatClientError` + UI 错误行 |
| 自动重连 | 未通过 | 只有手动重试 |
| Live2D 模型加载 | 部分 | 只验证 model3.json URL，不渲染模型 |
| 模型缩放 | 通过（占位层） | CSS 变量 `--pet-scale` |
| 初始位置 | 通过（窗口级） | Electron 主窗口右下角定位 |
| 默认表情 | 通过（状态机） | `neutral` |
| emotionMap | 未通过 | 未实现配置加载 |
| tapMotions | 未通过 | 未实现 |
| 根据 emotion 切换表情 | 部分 | 更新 data 属性，未调用 Live2D SDK |
| 根据 motion 播放动作 | 未通过 | 没有真实动作播放器 |
| 未知表情回退 neutral | 未通过 | 没有白名单校验 |
| 未知动作回退 idle | 未通过 | 没有白名单校验 |
| 播放 audio_url / audio_base64 | 通过（代码审计） | `AudioPlayer.ts` |
| 真实音频口型同步 | 未通过 | 当前为随机口型模拟 |
| 透明背景桌宠窗口 | 通过（代码审计） | `transparent: true`、无边框、置顶 |
| 文本输入 | 通过（代码审计） | `ChatPanel.tsx` |
| 语音输入 | 未通过 | 按钮占位 |
| 构建与单元测试 | 阻塞 | 整理环境无法下载完整 npm 依赖 |

## 集成优先级

P0：API 字段与情绪/动作枚举对齐；未知值回退。

P1：引入真实 Live2D 渲染器、表情动作控制和音频口型。

P1：实现 WebSocket 或明确采用 HTTP 轮询，并提供自动重连策略。

P2：接入 ASR、角色选择和模型配置加载器。
