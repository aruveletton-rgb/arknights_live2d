# 常见问题排查

## npm install 无法完成

确认网络可访问 npm 源，并使用 Node.js 20+。当前客户端已提交 `package-lock.json`；优先使用 `npm ci`，失败时记录具体网络或权限错误，不要删除锁文件。

## 桌宠窗口出现但没有 Live2D 模型

当前默认模型是项目自有 `placeholder_operator`。检查设置中的模型路径是否指向可访问的 `*.model3.json`，并确认同目录 `model_dict.json` 合法；正式 Live2D 模型仍需授权后接入。

## 后端请求失败

1. 确认地址形如 `http://host:port`，不要在末尾重复写 `/api/chat`。
2. 确认远端允许 Electron 渲染进程发起跨域请求。
3. 确认后端响应字段与客户端 `ChatResponse` 一致。
4. 查看 `docs/API_CONTRACT_ALIGNMENT.md`，处理 `text` 与 `reply_text` 的差异。

## 音频不播放

确认 `audio_url` 可直接访问，或 `audio_base64` 是有效音频数据。浏览器自动播放策略或跨域响应头也可能阻止播放；失败时客户端会保留文字回复。

## 表情或动作没有变化

当前实现将经过白名单和映射后的值写入 HTML `data-*` 属性，尚未调用真实 Live2D 表情/动作 API。正式模型获批后，再接入 `ExpressionController` 和 `MotionController` 的 Cubism 实现。

## 断线后没有自动重连

当前调用是一次性 HTTP `fetch`，仅支持请求失败提示和手动重试。WebSocket 自动重连尚未实现。

## 语音输入按钮不可用

默认配置关闭语音输入；开启后会调用 VM-2 的 Mock ASR Gateway，失败时保留文本输入路径。真实 ASR 供应商不在当前阶段。

## Windows 安装包构建失败

`npm run package` 需要下载 Electron 和签名工具。网络受限或没有代码签名证书时，先确认 `npm run build` 通过，再使用 `npm run package:dev` 生成未签名开发安装包。正式发布前必须补充签名证书和可验证的安装测试。
