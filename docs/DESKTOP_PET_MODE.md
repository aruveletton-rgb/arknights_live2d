# Electron 桌宠模式运行说明

## 1. 客户端入口

- Electron 主进程：`upstream/Open-LLM-VTuber/client/src/main/index.ts`
- 窗口创建：`src/main/window.ts`
- 托盘菜单：`src/main/tray.ts`
- React 入口：`src/renderer/main.tsx`
- 桌宠主界面：`src/renderer/App.tsx`

客户端当前启动后直接进入桌宠窗口，没有“普通窗口 / 桌宠窗口”双模式切换。

## 2. 环境要求

- Windows 10/11
- Node.js 20 或更高版本
- npm

## 3. 安装与启动

```bash
cd upstream/Open-LLM-VTuber/client
npm install
npm run dev
```

启动后窗口默认透明、无边框、置顶，并位于主显示器右下角。使用顶部拖动手柄移动窗口，角色舞台保留点击交互；窗口位置和大小会保存，并在显示器布局变化后恢复到可见区域。关闭窗口会驻留托盘，选择托盘“退出”才结束进程。托盘菜单支持显示/隐藏、打开设置、重启和退出。

## 4. Mock 模式

在设置面板中开启“Mock 模式”，或执行：

```bash
set VITE_MOCK_CHAT=1
npm run dev
```

Mock 模式不需要远端后端。情绪和动作使用 `docs/API_CONTRACT.md` 冻结的合同枚举；未知值由状态机和模型字典分别回退为 `neutral` 和 `idle`。

## 5. 连接远端后端

在设置面板中填写“后端服务地址”，例如：

```text
http://203.0.113.10:8000
```

客户端会请求：

```text
POST <后端服务地址>/api/chat
```

当前实现支持 HTTP/HTTPS 请求；没有 WebSocket 连接、`ws/wss` 配置或自动重连逻辑。HTTP 请求失败时会显示错误并允许手动重试。两台 VM 的职责和演示负载边界以 `docs/EXECUTION_PLAN.md` 第 4 节为准。

## 6. 切换角色

当前角色 ID 和模型路径由 `src/renderer/config/defaultConfig.ts` 提供默认值，模型路径可在设置面板中修改。打包后的默认资源使用相对路径以兼容 `file://`。角色 ID 尚未暴露为界面选项，需要后续增加角色列表或配置入口。

## 7. 音频与口型

客户端可播放后端返回的 `audio_url` 或 `audio_base64`。语音输入使用按住录音、松开提交；麦克风权限或 ASR 失败时保留文本输入。播放音频时使用 Web Audio `AnalyserNode` 计算口型强度；如果浏览器无法建立分析图，仍保留文本和音频播放降级。

## 8. 本地提醒

顶部铃铛打开提醒面板，可创建单次、每天、每周提醒和倒计时，支持取消与延后十分钟。自然语言输入只生成待确认草稿，点击确认后才保存。窗口隐藏到托盘时提醒轮询继续；完全退出程序或关机不保证触发。程序重新启动时会处理已到期事项，重复提醒推进到下一次时间。

## 9. 构建与打包

```bash
npm run build
npm run package
# 无代码签名证书或 GitHub 下载受限时的本地开发安装包
npm run package:dev
```

Windows 安装包输出到 `client/release/`。`npm run package:dev` 使用本机 Electron 运行时并关闭可执行文件签名修改，生成未签名开发安装包；正式发布仍需代码签名证书。

## 10. 当前验收状态

透明窗口、托盘、文本输入、设置持久化、HTTP 请求和音频播放代码已存在。第二阶段已完成占位模型元数据、模型字典校验及表情/动作回退；实际 Live2D 渲染、Cubism 动作调用、WebSocket 重连和真实音频口型仍未完成。
