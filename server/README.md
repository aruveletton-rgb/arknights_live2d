# server

MVP 服务端使用 Python 标准库实现，不需要额外 Python 包：

- `python -m server.orchestrator.app`：VM-1 编排、Mock LLM、主备 TTS 和 ASR 代理。
- `python -m server.tts_gateway.app`：VM-2 Mock TTS。
- `python -m server.asr_gateway.app`：VM-2 Mock ASR。

两台 VM 的推荐启动方式见 `deploy/vm1-gateway/` 和 `deploy/vm2-tts/` 的 Compose 文件。`POST /api/asr` 同时接受旧 JSON fixture 和客户端录音使用的 `multipart/form-data`（字段 `file`、`language`）。服务不加载本地模型；真实供应商接入必须经过新的授权和成本审计。

## 账号与数据服务（当前 VM-1 最小实现）

编排服务使用 SQLite 保存账号、会话、聊天文本和记忆，默认路径为 `data/arknights-vtuber.sqlite3`，可用 `DB_PATH` 覆盖。启动时同时设置 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 会创建首个管理员；密码不会明文落盘。管理员登录后通过 `POST /api/admin/users` 建立普通账号，不提供自助注册。

账号会话接口为 `/api/auth/login` 和 `/api/auth/logout`；历史为 `GET/DELETE /api/history`；记忆为 `GET/POST/PATCH/DELETE /api/memory`。历史查询只返回当前账号最近 30 天消息，默认删除接口清除当前账号全部历史。记忆新增和修改必须提交 `confirmed: true`。

`REQUIRE_ACCOUNT_AUTH=1` 会要求 `/api/chat`、`/api/asr`、`/api/tts` 使用账号会话；默认 `0` 保留已有匿名 Mock 联调。生产或公网环境仍必须设置非空 `API_TOKEN`，并在启用账号模式前完成 HTTPS、日志脱敏、备份和删除传播审计。

服务端最小回归验证：

```powershell
python -m unittest server.orchestrator.test_store server.orchestrator.test_api -v
python -m compileall -q server
```
