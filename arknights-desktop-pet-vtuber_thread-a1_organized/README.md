# 明日方舟风格桌宠 VTuber - 线程 A1 整理包

本包依据项目计划书的统一仓库结构，对原始 `client.zip` 中的 Electron 桌宠客户端进行归档。原始代码保持不变，统一放置在：

```text
upstream/Open-LLM-VTuber/client/
```

> 重要说明：压缩包中没有完整的 Open-LLM-VTuber 上游仓库。本目录只包含此次提交的独立客户端原型，不能视为完整上游快照。

## 当前范围

本包对应人员 1 / 线程 A1：桌宠客户端与 Live2D 接入。已整理的内容包括透明 Electron 窗口、托盘菜单、文本输入、Mock 对话、HTTP `/api/chat` 调用、音频播放、设置持久化、角色状态机和 Live2D 占位接入层。

尚未包含线程 A2、B、C 的正式实现；对应目录只放置边界说明，便于后续合并时保持统一结构。

## 快速启动

```bash
cd upstream/Open-LLM-VTuber/client
npm install
npm run dev
```

Mock 模式可在设置面板中开启，或使用：

```bash
set VITE_MOCK_CHAT=1
npm run dev
```

## 核心文档

- `docs/DESKTOP_PET_MODE.md`：桌宠启动、配置和远端连接说明
- `docs/LIVE2D_IMPORT.md`：Live2D 素材目录与接入约定
- `docs/TROUBLESHOOTING.md`：常见问题
- `docs/REPOSITORY_MAPPING.md`：原始压缩包到统一仓库的映射
- `docs/API_CONTRACT.md`：从计划书整理的参考合同（待全员冻结）
- `docs/API_CONTRACT_ALIGNMENT.md`：当前客户端与计划书 API 合同的差异
- `docs/INTEGRATION_GAP_REPORT.md`：A1 验收项完成度
- `audit/thread_a1_desktop_audit.json`：线程审计结果

## 当前结论

整理结果为 `partial`：目录和文档已符合计划书要求，但实际 Live2D SDK 渲染、真实音频驱动口型、WebSocket 自动重连、语音输入，以及 API 字段/枚举对齐仍需后续开发。
