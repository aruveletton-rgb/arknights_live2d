# 常见问题排查

## npm install 无法完成

确认网络可访问 npm 源，并使用 Node.js 20+。本次整理环境无法完整获取依赖，因此没有生成 `node_modules` 或 `package-lock.json`。

## 桌宠窗口出现但没有 Live2D 模型

这是当前原型的预期行为。检查设置中的模型路径是否指向可访问的 `*.model3.json`；即使文件可访问，当前代码也只完成路径验证，仍会显示 CSS 占位角色。

## 后端请求失败

1. 确认地址形如 `http://host:port`，不要在末尾重复写 `/api/chat`。
2. 确认远端允许 Electron 渲染进程发起跨域请求。
3. 确认后端响应字段与客户端 `ChatResponse` 一致。
4. 查看 `docs/API_CONTRACT_ALIGNMENT.md`，处理 `text` 与 `reply_text` 的差异。

## 音频不播放

确认 `audio_url` 可直接访问，或 `audio_base64` 是有效音频数据。浏览器自动播放策略或跨域响应头也可能阻止播放；失败时客户端会保留文字回复。

## 表情或动作没有变化

当前实现只把状态写入 HTML `data-*` 属性，并未调用真实 Live2D 表情/动作 API。需要完成 `Live2DRenderer`、`ExpressionController` 和 `MotionController` 的正式接入。

## 断线后没有自动重连

当前调用是一次性 HTTP `fetch`，仅支持请求失败提示和手动重试。WebSocket 自动重连尚未实现。

## 语音输入按钮不可用

按钮目前是占位功能，默认配置关闭语音输入，尚未接入线程 C 的 ASR Gateway。
