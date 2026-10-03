# 线程 B 两天实施计划：编排 + API + LLM

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：3 号
- 上层：[2 天总览](README.md)（拓扑、时间表、检查点、交接物以总览为准）
- 任务实施细节（模块划分、代码片段、单测要点）沿用 [v1 B 计划](../THREAD_B_IMPLEMENTATION_PLAN.md) 第 3 ~ 5 节，本文只写排期和差异

## 1. 范围与完成定义

| AC / IT | 本线程负责的部分 | 2 天内的目标状态 |
| --- | --- | --- |
| AC-02 | VM-1 orchestrator 对外可用（经 4 号的 Caddy） | `pass`；无证书时 `partial` |
| AC-04 | `/api/chat` 文本对话 | 有 LLM Key：`pass`；mock：`partial` |
| AC-05 | `/api/asr` 代理（B-10） | 有云 ASR Key：`pass`；mock：`partial` |
| AC-06 | TTS 调用、主备切换、音频代理 | `pass` |
| AC-07、08 | 输出枚举规范化 | 未知值回退 `neutral`/`idle`（IT-04） |
| AC-09、11 | `TTS_UNAVAILABLE` 降级；health 汇总 | 演练 D-1、D-2、D-4 结果正确 |
| AC-12 | VM-1 orchestrator 容器（B-09） | `compose ps` healthy；1 小时无 OOM |
| AC-14 | `server/orchestrator/README.md`、合同 v1.0 | 已合并 |

完成定义：

1. B-01 ~ B-10 的验证点有证据。
2. `thread-b-orchestrator` 分支 CI（`orchestrator.yml`）通过，第 1 天 CP4 前已合入 `develop`。
3. 提交 `audit/thread_b_audit.{md,json}`（第 9 节）。

2 天内不做：WebSocket 传输、会话持久化、多 worker、流式输出、上游 Open-LLM-VTuber 后端集成。

## 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| H-01 枚举提案 | 2 号 | D1 09:30 | 用 `API_CONTRACT.md` 现有 8 / 7 个枚举 |
| H-02 内部接口 | 4 号 | D1 09:30 | 用 v1 C 计划 §6.1 原文，`node` 改为 `primary`/`fallback` |
| H-05 角色包 | 2 号 | D1 13:00 | 用 `tests/fixtures/character_pack/` 测试样例 |
| H-08 tts_gateway 本机 | 4 号 | D1 13:00 | `httpx.MockTransport` 单测；联调顺延 |
| H-11 asr_gateway 本机 | 4 号 | D1 16:00 | 同上 |
| H-09 VM 已装 Docker | 4 号 | D1 14:00 | B-09 只做本机 Docker 验证 |
| P-04 LLM Key | 拥有者 | 开工前 | `LLM_PROVIDER=mock` |

## 3. 文件变更

与 v1 B 计划第 3 节相同。差异：

| 路径 | 差异 |
| --- | --- |
| `server/common/schemas/chat_response.json`、`internal_tts.json` | `audio_url` 示例和 `node` 取值为 `primary`/`fallback` |
| `server/orchestrator/app/tts_client.py` | 节点表 `[("primary", TTS_PRIMARY_URL), ("fallback", TTS_FALLBACK_URL)]`，不再写死 VM 编号 |
| `server/orchestrator/app/routes/audio.py` | `{node}` 白名单为 `primary`、`fallback` |
| `deploy/vm1-gateway/.env.example` | `TTS_FALLBACK_URL=http://tts_fallback:8082`；`TTS_PRIMARY_URL`、`ASR_GATEWAY_URL` 指向 `<vm2-private>` |

## 4. 时间表

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会；决策 D2、D3、D4、D8 按默认拍板 | 结论写入启动会记录 |
| D1 09:00 ~ 09:30 | B-01 `docs/UPSTREAM_EVALUATION.md` 定稿（H-03）：沿用已有调研，内存结论标“未实测” | 全员已读 |
| D1 09:30 ~ 10:30 | B-02 合同 v1.0：`docs/API_CONTRACT.md` + 8 个 schema + 15 个 fixtures；并入 H-01、H-02 | `test_fixtures_schema.py` 通过；四人在 PR 中确认；CP1 合并（H-04） |
| D1 10:30 ~ 13:00 | B-03 骨架：config、`/api/health`、`/api/chat`（mock LLM 与触发词）、`/api/characters`、错误对象；B-08 鉴权、CORS、日志；`orchestrator.yml` | `test_config`、`test_chat`、`test_health`、`test_errors`、`test_security` 通过；H-10：1 号对本机 12393 完成一次对话 |
| D1 13:00 ~ 14:30 | B-04 角色包加载（接 H-05）；B-05 LLM 适配与解析 | `test_characters`、`test_real_pack`、`test_llm_parse`、`test_llm_openai` 通过 |
| D1 14:30 ~ 16:30 | B-06 TTS 客户端、主备切换、熔断、音频代理（接 H-08） | `test_tts_client`、`test_audio_proxy` 通过；本机 tts 两个进程，停 primary 后 `node=fallback` |
| D1 16:30 ~ 18:00 | B-07 会话；B-08 限速与并发；B-10 `/api/asr` 代理（接 H-11） | `test_sessions`、`test_asr_proxy` 通过；样例 WAV 经本机 12393 返回文字 |
| D1 18:00 | CP3：`thread-b-orchestrator` CI 绿；`test_contract_responses.py` 通过 | — |
| D1 18:00 ~ 20:00 | B-09 `Dockerfile`、`deploy/vm1-gateway/compose.yaml`、`.env.example`（H-13，20:00）；本机 `docker compose up` 验证 | 容器 healthy；`docker stats` 低于 256m |
| D1 20:00 ~ 22:00 | 按顺序合入 `develop`（总览 8.1）；本机集成 IT-01 ~ IT-08（v1 B 计划 §5.3 的触发方法）；B-07 长跑（本机 Docker，`mem_limit 256m`） | IT 结果表；长跑内存增长 < 20 MiB |
| D2 08:30 ~ 09:00 | 站会 | — |
| D2 09:00 ~ 11:00 | B-09 VM-1 部署：orchestrator 先绑私网地址，VM-1 本机 curl chat；与 4 号叠加 tts_fallback、caddy；证书签发后改绑 `127.0.0.1` | `compose ps` healthy；经 https 的 health 返回 `tts=ok`、`asr=ok` |
| D2 11:00 ~ 12:00 | 远程 IT-01 ~ IT-08；有 LLM Key 时与 2 号做 Prompt 10 轮实测；D-9 期间每分钟 1 次 `/api/chat` | CP5；`dialogue_cases.md` 结果表 |
| D2 13:00 ~ 16:00 | 13:00 ~ 13:30 准备演练用的请求脚本（4 号部署 C-08b/c）；13:30 起与 4 号执行演练 D-1 ~ D-8，负责 orchestrator 侧输出（`audio_url` 节点、错误码、health 字段） | 每项命令输出 |
| D2 16:00 ~ 18:00 | `audit/thread_b_audit.{md,json}`；`server/orchestrator/README.md` 定稿 | CP7 |

## 5. 与 v1 任务细节的差异

| 任务 | v1 | 2 天版 |
| --- | --- | --- |
| B-01 | 3 h 调研，10-12 交付 | 沿用已有调研结论（依赖重、推测超过 256m，未实测），D1 09:30 定稿 |
| B-02 | 10-13 发 PR，10-15 合并 | D1 10:30 合并；评审在 PR 内同步进行，四人当场确认 |
| B-03 | 骨架在 D2 前、业务在 D2 后 | 合同冻结后一次完成 |
| B-06 | 节点 `vm2` → `vm4`；熔断可后移 | 节点 `primary` → `fallback`；熔断 30 s 当天完成 |
| B-06 health | — | `tts` 字段按总览第 4 节：两个节点都 ok → `ok`；一个 → `degraded`；都不通 → `down` |
| B-07 长跑 | 1000 会话 / 5000 请求 | 不变，放在 D1 晚间本机 Docker 内执行 |
| B-09 | W5 实机；只交 orchestrator | 第 2 天上午实机；`compose.yaml` 与 4 号的 `compose.caddy.yaml`、`compose.tts.yaml` 叠加，服务名 `orchestrator` 不变 |
| B-10 | 大小预检可后移 | 当天完成：按字节计数读取，1 MB 上限 |
| CORS | `CORS_ORIGINS` 含 `http://127.0.0.1:5173` 和 `null` | D2 09:00 1 号报告打包后实际 Origin，B 当天更新 `.env` |

## 6. 测试

- 单元测试：沿用 v1 B 计划 §5.1，全部在 D1 CP3 前通过；`test_tts_client.py` 的节点名改为 `primary`/`fallback`，增加“只剩一个节点时 health 为 `degraded`”。
- 合同测试：`test_fixtures_schema.py`、`test_contract_responses.py`（v1 B 计划 §5.2）。
- 本机集成：总览 8.2；IT 触发方法见 v1 B 计划 §5.3，其中 IT-05 改为“停 primary 和 fallback 两个 tts 进程”。
- 远程：D2 上午远程 IT；D2 下午演练 D-1 ~ D-8。
- CI：`orchestrator.yml`，`pytest -q -m "not llm_live"`；`llm_live` 用例只在有 Key 时本机执行，结果记入审计。

## 7. 交付物

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-03 | `docs/UPSTREAM_EVALUATION.md` | D1 10:00 | 全员已读 |
| H-04 | 合同 v1.0 + schemas + fixtures | D1 10:30 | 四人确认；schema 校验通过 |
| H-10 | orchestrator 本机 mock 模式 | D1 13:00 | 1 号完成一次对话 |
| H-13 | `deploy/vm1-gateway/compose.yaml` + `.env.example` | D1 20:00 | 4 号叠加两个文件启动成功 |
| — | mock LLM 触发词（`/mock:bad_json`、`/mock:unknown_enum`、`/mock:timeout`、`/mock:error`、`/mock:long`） | 随 H-10 | 1 号复现 IT-04、IT-08 |

本机运行命令沿用 v1 B 计划 §6，写入 `server/orchestrator/README.md`。

## 8. 风险

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| D1 10:30 合同未冻结 | 三线程返工 | 最晚 12:00 冻结（总览 CP1）；冻结前各线程按 WA 默认 |
| LLM 不按 JSON 输出 | AC-04、07、08 | B-05 解析兜底；2 号改 Prompt |
| 无 LLM Key | AC-04 | mock 演示，`partial` |
| VM-1 内存紧张（三个容器） | OOM | 单 worker、会话上限 500；超判定线按总览 3.2 调整 |
| 共享令牌泄露 | 滥用、费用 | 限速、并发上限；轮换步骤写入 C-10 |
| `audio_url` 免令牌 | 隐私 | 沿用 v1：`audio_id` 含 voice/speed/emotion；缓存 72 h；已登记为接受的风险 |

## 9. 审计

- 文件：`audit/thread_b_audit.{md,json}`，字段沿用 v1 B 计划 §9（`contract`、`llm_live`、`soak` 等）。
- 另加 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}` 和 `remote_it[]{id,result,evidence}`（D2 远程 IT 结果）。
- 证据中的令牌一律写 `***`，地址写 `<vm1-domain>`、`<vm2-private>`。

## 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | `character_id` 可省略、`text` ≤ 500 字、请求体 ≤ 16 KB、同时失败时 `error` 优先 `LLM_*` | D1 CP1 合同评审 |
| 2 | Electron 打包后的 Origin 是否需要加入 `CORS_ORIGINS` | D2 09:00 后（1 号实测） |
| 3 | 256m 是否够用（含 B-07 长跑） | D1 晚间本机；D2 D-9 实机 |
