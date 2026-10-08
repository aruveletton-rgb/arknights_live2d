# 线程 A 执行报告（阶段候选）

日期：2026-10-08（北京时间）  
基线：`main` / `a75bb63f75a9f2c96715bb7b53055736bbf40a94`  
状态：`candidate`，等待真实 Cubism 资源、供应商资格和实机验收

## 用户审计状态

用户已明确确认 G0～G4 和 A0 → A6 执行顺序。执行期间仍按实际证据区分 `pass`、`unverified` 和 `blocked`；批准计划不等于供应商资格、素材许可或 Windows 实机结果已通过。

## 已实施

### A1 桌面壳与资源路径

- 单实例失败时不再注册后续生命周期；第二实例聚焦已有窗口。
- 关闭窗口驻留托盘，托盘“退出”才结束进程；托盘重启通过正常退出流程。
- 窗口位置和大小写入 Electron `userData/window-bounds.json`，启动时限制在可见显示器工作区。
- 顶部新增拖动手柄，角色舞台不再整体吞掉点击区域。
- Vite 使用相对资源基址，打包后的 `file://` 页面引用 `./assets/...`。
- 打包目标增加 NSIS 和 portable。

### A3/A4 客户端底座

- 会话 UUID 与配置分离；增加语言、Bearer 令牌和客户端状态字段。
- `/api/chat` 响应增加结构校验、会话匹配、未知情绪/动作回退和错误码映射基础。
- 按住录音、松开提交；麦克风拒绝、浏览器不支持录音、ASR 失败均回退文本输入。
- 音频播放器使用 Web Audio `AnalyserNode` 计算口型强度，移除随机口型定时器。

### A4 Mock 服务适配

- `/api/asr` 保留 JSON fixture 兼容，并接受 multipart `file` + `language`。
- 编排服务把 multipart 音频转发到 ASR gateway。
- 本机 Mock 聊天继续支持主 TTS 失败时的备用字幕/音频降级。

### A5 提醒工具

- 本地持久化单次、每天、每周提醒和倒计时输入。
- 托盘驻留期间由渲染进程轮询到期提醒；一次性提醒消费，重复提醒推进下一次时间。
- 支持查看、取消、延后十分钟和系统通知/短提示音。
- 自然语言只生成草稿，用户点击确认后才保存；API 不可用时手动表单仍可用。

## 验证证据

| 项目 | 结果 |
|---|---|
| `npm run build` | 通过 |
| `npm test` | 通过，9 个测试文件、21 个测试 |
| `python -m compileall -q server` | 通过 |
| 本机 JSON ASR | 通过 |
| 本机 multipart ASR | 通过 |
| 本机 `/api/chat` | 通过；主 TTS 不可用时返回备用 Mock 音频和降级错误 |
| `npm run package:dev` | 通过；生成 NSIS 安装包和 portable 可执行文件 |
| 打包资源路径 | `dist/renderer/index.html` 使用 `./assets/...` |

发布产物（未签名，未提交，由构建目录生成）：

- `upstream/Open-LLM-VTuber/client/release/Arknights VTuber Pet Setup 0.1.0.exe`
- `upstream/Open-LLM-VTuber/client/release/Arknights VTuber Pet 0.1.0.exe`

SHA-256：

- 安装包：`0C65731C6BC51ACD107D0AB7BF00A92F4F91E59BB41305623C1D324662E66004`
- 便携版：`0021DB91BCC6E96BDB4495547B0E523AD19833C52BDFC36B88D7EFCC62C2223F`

## 阻塞与未验证

1. **A2 真实 Cubism**：当前仓库和下载目录没有可审计 `.moc3`、真实 `model3.json` 或 Cubism Core，依赖 Pixi/Cubism 也未安装。当前仍是占位模型元数据和 DOM 表现，不能验收为真实 Cubism。
2. **真实供应商**：未调用 Groq/Azure；ZDR、F0、地区、额度、真实 ASR/LLM/TTS 延迟和失败率均为 `unverified`。
3. **Windows 实机**：打包命令在当前 Windows 开发环境通过，但尚未完成干净系统安装、卸载、多显示器/DPI、托盘录屏和睡眠恢复验收。
4. **公网部署**：未操作 DNS、证书、VM 或公网 HTTPS；麦克风公网权限未验证。
5. **数据服务**：VM-1 已加入 SQLite 账号、会话、30 天历史和明确确认记忆的最小合同与实现；客户端登录界面、跨端历史接线、备份传播和删除传播仍未完成或验证。

## P0-3 共用数据服务候选实现

- `server/orchestrator/store.py`：账号、会话、消息和记忆表；PBKDF2-SHA256 密码哈希；Bearer 会话只保存 SHA-256 摘要；管理员环境变量引导。
- `server/orchestrator/app.py`：登录、注销、管理员建号、历史查询/删除、记忆 CRUD；`/api/chat` 在账号会话存在时写入 user/assistant 文本；服务端从会话确定 `user_id`。
- 认证兼容：`REQUIRE_ACCOUNT_AUTH=0` 保留匿名 Mock 联调；设置为 `1` 后 `/api/chat`、`/api/asr`、`/api/tts` 需要账号会话。
- 原始录音不写入消息表；当前实现只保存文本、语言、角色和会话 ID。
- 客户端设置面板增加登录/注销、账号历史载入、长期记忆新增和删除；账号 token 仅保存在当前 Electron 渲染会话的 `sessionStorage`，服务访问令牌仍由原有配置项管理。

### P0-3 验证证据

| 项目 | 结果 |
|---|---|
| `python -m unittest server.orchestrator.test_store server.orchestrator.test_api -v` | 通过，5 个用例；密码哈希、错误密码、会话过期/注销、双账号隔离、30 天过滤、记忆确认/删除和 HTTP 路由均覆盖 |
| `python -m compileall -q server` | 通过 |
| `git diff --check -- server/orchestrator server/common/http_utils.py` | 通过 |
| `npm run build` | 通过；账号客户端接线编译成功 |
| `npm test` | 通过，9 个测试文件、21 个测试 |

P0-3 当前状态为 `candidate`：最小本地服务合同和桌面端账号/历史/记忆接线已验证，但备份、跨端同步、删除传播、审计日志脱敏和生产数据库运维仍为 `unverified`。

## A2 外部只读核对

- 官方样例入口：[Live2D Sample Data](https://www.live2d.com/en/learn/sample/)，HTTP 200。
- 官方样例条款：[Terms of Use for Live2D Cubism Sample Data](https://www.live2d.com/en/learn/sample/model-terms/)，HTTP 200；页面列出 Live2D 原创样例角色及版权标注要求。
- 官方 Web SDK 入口：[Cubism SDK for Web](https://www.live2d.com/en/sdk/download/web/)，HTTP 200；本次只读查看，未下载、未提交 SDK/Core。
- 结论：来源和条款入口已找到，但具体模型包、Core 文件、SDK 版本和允许随安装包分发的范围仍未锁定，A2 继续保持 `blocked/unverified`。

## 用户复核点

- A1/A3/A4 Mock/A5 可进入下一阶段审计；证据以本报告、manifest、构建输出和测试输出为准。
- A2 需要用户提供或批准许可明确的 Cubism 样例包、SDK/Core 版本及分发范围。
- 真实供应商链路需要用户在安全环境提供资格/控制台证据；本报告不包含密钥或令牌。
- 发布状态保持 `candidate`，直到真实模型、真实链路和 Windows 实机验收通过。
