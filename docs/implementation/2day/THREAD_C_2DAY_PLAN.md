# 线程 C 两天实施计划：TTS/ASR + 两台服务器部署

- 版本：2day-v1
- 写法：时间中的 D1、D2 指第 1 天、第 2 天；启动会决策一律写作“决策 Dn”（总览第 11 节）
- 负责人：4 号
- 上层：[2 天总览](README.md)（拓扑、时间表、检查点、交接物以总览为准；两台拓扑见总览第 3 节）
- 任务实施细节（网关模块、缓存、音频校验、脚本规则、Caddyfile）沿用 [v1 C 计划](../THREAD_C_IMPLEMENTATION_PLAN.md) 第 4 ~ 6 节，本文只写排期和两台方案带来的差异

## 1. 范围与完成定义

| AC | 本线程负责的部分 | 2 天内的目标状态 |
| --- | --- | --- |
| AC-02 | VM-1 HTTPS 入口（Caddy） | `pass`；无域名降级时 `partial` |
| AC-05 | asr_gateway | 有云 ASR Key：`pass`；mock：`partial` |
| AC-06 | tts_gateway（primary、fallback） | `pass` |
| AC-09、10 | 网关故障语义（503） | 演练 D-1、D-2、D-3 结果正确 |
| AC-12 | 两台 Compose 部署 | `compose ps` healthy；D-5、D-6 重启自启；D-9 无 OOM |
| AC-13 | `healthcheck.sh` 定位故障服务 | D-1、D-3 输出指出具体主机和服务，退出码正确 |
| AC-14、16 | `SERVER_DEPLOYMENT.md`、`TTS_ASR_GUIDE.md` | 非作者验证有记录（2 号，D2 下午） |

完成定义：

1. C-01 ~ C-10 的验证点有证据（命令 + 脱敏输出）。
2. `thread-c-voice-ops` 分支 CI（`voice-ops.yml`）通过，D1 CP4 前已合入 `develop`。
3. 提交 `audit/thread_c_audit.{md,json}` 和 `audit/server_verification/` 下的核实记录（第 9 节）。

2 天内不做：告警推送、Azure TTS provider（O-01 有 Key 也只做 edge_tts + mock）、镜像仓库（各 VM 本地构建）、日志集中收集。

## 2. 依赖与决定前做法

| 依赖 | 来源 | 截止 | 未到时 |
| --- | --- | --- | --- |
| P-01 VM 登录与 NSG 权限 | 拥有者 | 开工前 | 只做本机开发；D2 09:00 仍未到位按总览 R-01 用本机 Docker 模拟两台 |
| P-02 同一 VNet | 拥有者 | 开工前 | 改走公网地址 + NSG 白名单 + 内部令牌，在 C-01 记录 |
| P-03 域名 | 拥有者 | D2 09:00 | sslip.io（需同意）；再不行 HTTP + 团队 IP 白名单 |
| P-05 云 ASR Key | 拥有者 | 开工前 | `ASR_PROVIDER=mock` |
| H-04 合同 | 3 号 | D1 10:30 | 按 H-02 自己的提案先写 |
| H-07 `voices.yaml` | 2 号 | D1 12:00 | 用 v1 C 计划 C-02 中的提案格式，单音色 `zh-CN-XiaoyiNeural` |
| H-13 VM-1 `compose.yaml` | 3 号 | D1 20:00 | `compose.caddy.yaml`、`compose.tts.yaml` 先单独验证 |
| H-14 WAV 样例 | 1 号 | D1 20:00 | 用 Python `wave` 生成的 16 kHz 测试音频 |

## 3. 文件变更（取代 v1 C 计划第 3 节中的部署部分）

服务代码（`server/tts_gateway/`、`server/asr_gateway/`）、`scripts/` 与 v1 相同。部署目录改为：

| 路径 | 动作 | 任务 | 说明 |
| --- | --- | --- | --- |
| `deploy/vm1-gateway/compose.tts.yaml` | 新建 | C-06 | 服务 `tts_fallback`；端口 `${PRIVATE_BIND_ADDR:?}:8082:8082`；`mem_limit: 256m`；独立缓存卷 `tts_cache_fallback`；卷与环境变量和 `vm2-voice` 的 tts 服务一致 |
| `deploy/vm1-gateway/.env.tts.example` | 新建 | C-06 | `TTS_*`、`VOICE_MAP_FILE`、`INTERNAL_TOKEN`。与 orchestrator 的 `.env` 分开，避免 LLM Key 进入 TTS 容器 |
| `deploy/vm1-gateway/compose.caddy.yaml`、`Caddyfile` | 新建 | C-09 | 同 v1 C 计划 §4.9 |
| `deploy/vm2-voice/compose.yaml` | 新建 | C-03 | 服务 `tts_gateway`（8082）、`asr_gateway`（8083），都绑 `${BIND_ADDR:?}`（VM-2 私网地址），各 `mem_limit: 256m`，`restart: unless-stopped` |
| `deploy/vm2-voice/.env.tts.example`、`.env.asr.example` | 新建 | C-03 | 两个服务各用自己的 env 文件，ASR Key 不进 TTS 容器 |
| `deploy/vm2-voice/cron.example` | 新建 | C-06 | 健康检查每 5 分钟；备份每日 03:30 |
| `deploy/vm2-voice/README.md` | 新建 | C-10 | 指向 `SERVER_DEPLOYMENT.md` |
| `deploy/vm2-tts/`、`vm3-asr/`、`vm4-fallback/` 的 `README.md` | 修改首行 | — | 注明“2 台方案下停用，见 `deploy/vm2-voice/`”；不删除（总览 3.1） |
| `scripts/hosts.example.conf` | 新建 | C-07 | 4 行，见 §5.2 |
| `audit/server_verification/<日期>_c01.{md,json}`、`latest_c01.{md,json}` | 新建 | C-01 | 已脱敏 |
| `audit/thread_c/` | 新建 | C-03 ~ D-9 | stats 日志、演练记录（已脱敏） |
| `audit/thread_c_audit.{md,json}` | 新建 | 全部 | 第 9 节 |

## 4. 时间表（4 号）

| 时间 | 任务 | 验证点 |
| --- | --- | --- |
| D1 08:30 ~ 09:00 | 启动会；确认 P-01、P-02、P-06；决策 D5、D7 按默认拍板 | 结论写入启动会记录 |
| D1 09:00 ~ 09:30 | H-02 内部接口提案（v1 C 计划 §6.1；`audio_id` 规则不变，orchestrator 对外节点名按总览第 4 节改为 `primary`/`fallback`） | 3 号并入 B-02 |
| D1 09:30 ~ 10:30 | C-01 两台 VM 只读核实（§5.1） | 记录已脱敏存档；H-09 第一部分 |
| D1 10:30 ~ 13:00 | C-02 tts_gateway：mock provider、`audio_id`、缓存、`voices.yaml`（接 H-07）、内部令牌、错误语义；同时编写 C-08a `install_vm.sh`（默认 dry-run） | `test_validation`、`test_audio_id`、`test_cache`、`test_auth`、`test_errors`、`test_mp3`、`test_voices`、`test_audio_get` 通过；H-08：3 号本机调用成功 |
| D1 13:00 ~ 14:00 | C-08a 在两台执行：先 dry-run，再 `--apply --approved-by <拥有者>`（Docker + swap，不加 `--firewall`）；NSG 规则（总览 3.3）提交拥有者审批后配置 | 第二次执行无变化；`docker version`、`swapon --show`；H-09 第二部分 |
| D1 14:00 ~ 16:00 | C-04 asr_gateway：音频校验、mock、云 ASR 映射、隐私 | `test_audio_validation`、`test_mock`、`test_cloud_mapping`、`test_privacy` 通过；H-11 |
| D1 16:00 ~ 17:00 | C-02 edge_tts provider；有 Key 时云 ASR 本机实测 | `@pytest.mark.network` 用例本机通过，结果记入审计 |
| D1 17:00 ~ 18:00 | C-07 `healthcheck.sh` + `test_healthcheck.py`；`voice-ops.yml`；`deploy/vm2-voice/` 文件 | `shellcheck`、`bash -n` 通过；`docker compose config` 无错；CP3：`thread-c-voice-ops` CI 通过 |
| D1 18:00 ~ 20:00 | C-03 / C-05 VM-2 部署 `deploy/vm2-voice/`（tts 用 edge_tts，不需要 Key；asr 有 Key 用真实值，否则 mock）；编写 `compose.tts.yaml`、`compose.caddy.yaml`、`Caddyfile`（C-06、C-09 文件部分） | VM-2 `compose ps` healthy；VM-1 经私网 curl `/api/tts`、`/api/asr` 返回 200；管理端直连 8082/8083 失败 |
| D1 20:00 ~ 22:00 | 合入 `develop`（总览 8.1，第二个合并）；与 3 号本机集成（4 进程）；用 H-14 WAV 验证 asr_gateway；C-10 初稿（按 VM-2 实际部署步骤写，供 2 号第 2 天上午预读） | IT-02、IT-03、IT-05、IT-06 结果；与 H-13 叠加后 `docker compose config` 无错；CP4；初稿已提交到 PR |
| D2 08:30 ~ 09:00 | 站会；确认演练窗口 | — |
| D2 09:00 ~ 11:00 | VM-2 复核（D1 晚间未完成时在此补做）；VM-1：叠加 `compose.tts.yaml`（tts_fallback）和 `compose.caddy.yaml`（与 3 号的 `compose.yaml`）；证书签发；VM-2 安装健康检查 cron | `curl https://<vm1-domain>/api/health` 返回 `tts=ok`、`asr=ok`；`curl -sI http://<vm1-domain>/` 返回 308；healthcheck 全部 ok，退出码 0 |
| D2 11:00 ~ 12:00 | D-9 两台 1 小时资源测量（§5.6）；测量期间不改远程服务，只在本机写 C-08b `backup_config.sh`、C-08c `update_all.sh` 和 `test_ops_dryrun.py` | stats 日志；dry-run 输出不含令牌和地址；CP5 |
| D2 13:00 ~ 13:30 | 两台部署 C-08b/c；VM-2 加备份 cron；拥有者授权后配置受限备份密钥；手动执行一次 `backup_config.sh --pull` | `tar -tzf` 不含 `.env`；VM-2 上有 VM-1 的备份包 |
| D2 13:30 ~ 16:00 | 与 3 号执行演练 D-1 ~ D-8（总览 8.4，C 侧细节见 §5.4、§5.5）；根据 2 号的非作者验证修订 C-10 | 每项命令输出；文档修订记录；CP6 |
| D2 16:00 ~ 18:00 | 关闭 NSG 12393 临时放行；敏感信息扫描；`audit/thread_c_audit.{md,json}` | CP7 |

## 5. 两台方案的任务差异

### 5.1 C-01 服务器核实

沿用 v1 C 计划 §4.1 的只读命令和脱敏模板，记录表改为两列（vm1、vm2）。另加 3 项：

1. 两台是否在同一 VNet / 子网，从 VM-1 `nc -zv <vm2-private> 22` 是否连通（只测连通，不登录）。
2. NSG 当前入站规则清单（门户或 `az network nsg rule list` 只读），确认默认规则是否放行同 VNet 流量（关闭总览待决项 R-09）。
3. 磁盘可用空间是否 ≥ 5 GiB（swap 与镜像构建）。

### 5.2 C-07 健康检查

`scripts/hosts.example.conf`：

```text
# vm   service        url
vm1    orchestrator   https://<vm1-domain>/api/health
vm1    tts_gateway    http://<vm1-private>:8082/api/health   # tts_fallback，只绑私网地址
vm2    tts_gateway    http://<vm2-private>:8082/api/health   # primary
vm2    asr_gateway    http://<vm2-private>:8083/api/health
```

- 运行位置：VM-2 的 cron（`*/5 * * * *`，写 `health.log` 和 `health.latest`）。脚本不依赖所在主机，VM-1 也能手动运行。
- VM-2 整机停机（D-5）时 cron 不运行：在 VM-1 上手动执行 healthcheck，期望 vm2 两行 down、退出码 2；同时 orchestrator health 应为 `tts=degraded`、`asr=down`。
- 输出格式、判定规则、退出码与 v1 C 计划 §4.7 相同。

### 5.3 C-06 备用 TTS 与备份

- 备用 TTS 在 VM-1（`tts_fallback`），镜像和 `IMAGE_TAG` 与 VM-2 相同，缓存卷独立。
- 备份内容与 v1 C 计划 §4.6 的表相同（不备份 `.env` 明文，只记键名和 8 位哈希）。存放：
  - 每台本地保留 3 份；
  - VM-2 每日用受限密钥拉取 VM-1 的 `backup_config.sh --emit`，保留 14 份；VM-2 自身的备份只在本地；
  - 受限密钥需要拥有者授权；未授权时两台只做本地备份，4 号在演练后手动取回一份到团队存储。
- 已知局限：VM-2 整机丢失时其自身配置备份同时丢失，恢复依赖 git 仓库中的部署文件和密码管理器中的 `.env` 值。写入 C-10 和审计 `open_items`。

### 5.4 C-08 安装、更新、回滚

- `install_vm.sh --role vm1|vm2`。其他规则不变：默认 dry-run；`--apply` 需 `--approved-by`；防火墙只在 `--firewall` 时执行且禁止 `ufw reset`。2 天内不执行 `--firewall`，网络控制靠 NSG + 绑定地址。
- `update_all.sh --tag <tag>` 顺序改为 VM-2 → VM-1：
  1. 先在目标 VM 上 `docker compose build`，再 `up -d`，缩短停机时间。
  2. VM-2 更新期间 TTS 由 VM-1 的 fallback 接管，ASR 短暂返回 503（只在演练窗口执行）。
  3. VM-2 健康检查失败时自动回滚并停止，VM-1 不受影响。
  4. 每个服务保留最近 2 个 tag 的镜像。
- D-7 回滚演练不向远程推任何东西：在 VM-2 的工作副本上建本地分支 `drill-bad-health`，提交一处会让 tts_gateway 启动校验失败的改动，打本地 tag `drill-bad`，执行 `update_all.sh --tag drill-bad`；期望自动回滚到上一个 tag。演练后删除这个本地 tag 和分支。

### 5.5 演练中 C 侧的检查

| 演练 | C 侧操作与证据 |
| --- | --- |
| D-1 | `docker compose stop tts_gateway`（VM-2）；healthcheck 输出 + 退出码 2 |
| D-2 | 再 `stop tts_fallback`（VM-1）；healthcheck 两行 tts down |
| D-3 | `stop asr_gateway`（VM-2）；healthcheck 输出 |
| D-5 | 拥有者在场，`sudo reboot`（VM-2）；在 VM-1 手动 healthcheck；开机后 `uptime`、`compose ps`、cron 恢复运行 |
| D-6 | 拥有者在场，重启 VM-1；开机后 `compose ps`、证书有效期（`openssl s_client`） |
| D-7 | 见 §5.4 |
| D-8 | VM-2 上 `tar -tzf` 确认拉取到的 VM-1 备份包完整且不含 `.env`，记录 sha256；在 VM-1 上把本地最近一份备份解包到临时目录（受限密钥只能执行 `--emit`，不回传），`diff -r` 对比部署目录，期望只差 `.env`，然后删除临时目录 |
| D-9 | §5.6 |

每项演练后先恢复服务、确认 healthcheck 全部 ok，再做下一项。

### 5.6 资源测量（D-9）

两台同时测 1 小时（D2 11:00 ~ 12:00），命令沿用 v1 C 计划 §4.11，结果存 `audit/thread_c/<vm>_stats_<日期>.log`（复制前脱敏）。负载：3 号每分钟经 https 发 1 次 `/api/chat`（含 TTS），每 5 分钟 1 次 `/api/asr`。判定线见总览 3.2；超限时按总览 3.2 的顺序调整并复测 30 分钟。

### 5.7 与 v1 的差异汇总

| 项 | v1 | 2 天版 |
| --- | --- | --- |
| 拓扑 | VM-2 tts、VM-3 asr、VM-4 备用 tts + cron | VM-2 tts（primary）+ asr + cron；VM-1 备用 tts（fallback）（总览 3.1） |
| C-01 | 4 台核实 | 2 台核实 + VNet / NSG / 磁盘 3 项（§5.1） |
| C-03、C-05 | 两个部署目录 | 合并为 `deploy/vm2-voice/`，同一天晚间部署 |
| C-06 | VM-4 独立部署 | VM-1 叠加 `compose.tts.yaml`；备份拉取改由 VM-2 执行（§5.3） |
| C-07 | 运行在 VM-4 | 运行在 VM-2；D-5 期间在 VM-1 手动运行（§5.2） |
| C-08a | `--role` 取 vm1 ~ vm4 | `--role` 取 vm1 或 vm2 |
| C-08c | VM-4 → VM-2 → VM-3 → VM-1 | VM-2 → VM-1（§5.4） |
| C-10 非作者验证 | 3 号或 2 号，在一台 VM 从零部署 | 2 号，在本机 Docker 按文档部署 + VM-2 上 `install_vm.sh` dry-run；不改动正在运行的服务，AC-16 部署部分最高 `partial`（A 计划 §4.2） |
| 削减顺序 | v1 §7 按工时削减 | 取消；落后时按总览第 6 节检查点处理 |

## 6. 测试

- 单元测试：沿用 v1 C 计划 §5.1，全部在 D1 CP3 前通过。差异：
  - `test_healthcheck.py` 的桩配置改为 4 行（vm1 两行、vm2 两行），增加“vm1 tts_gateway down、其余 ok → 退出码 2，`failed=vm1/tts_gateway`”。
  - `test_ops_dryrun.py` 增加 `update_all.sh` 的 dry-run 顺序断言（VM-2 在 VM-1 之前）和 `install_vm.sh --role vm3` 被拒绝（退出码 3）。
- 合同测试：沿用 v1 C 计划 §5.2；H-04（D1 10:30）之后删除本地 schema 副本。
- 本机集成：总览 8.2（4 进程：orchestrator 12393、tts 8082 primary、tts 8084 fallback、asr 8083）。
- 部署验证：
  - `docker compose config`（两台各自的叠加组合）无错；
  - 管理端直连 VM-2 的 8082/8083 和 VM-1 的 8082 必须失败；
  - 从 VM-1 访问 VM-2 的 8082/8083 成功，带错误令牌返回 401。
- 演练：总览 8.4 的 D-1 ~ D-9，C 侧证据见 §5.5。
- CI：`voice-ops.yml`，`pytest -q -m "not network"` + `shellcheck scripts/*.sh`；`network` 用例只在本机执行，结果记入审计。

## 7. 交付物

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-02 | 内部接口提案（v1 C 计划 §6.1，节点名按总览第 4 节） | D1 09:30 | 3 号并入合同 v1.0 |
| H-08 | tts_gateway 本机可运行（mock；edge_tts 在 D1 17:00 前补上） | D1 13:00 | 3 号按 README 启动，`/api/tts` 返回音频 |
| H-09 | C-01 核实记录；两台已装 Docker + swap | D1 10:30；14:00 | 3 号确认记录；两台 `docker compose version` |
| H-11 | asr_gateway 本机可运行（mock） | D1 16:00 | 1、3 号用样例 WAV 调用成功 |
| — | `TTS_MOCK_FAULT`、`ASR_MOCK_FAULT` 故障注入 | 随 H-08、H-11 | 3 号本机复现 IT-05、IT-06 |
| — | `compose.tts.yaml`、`compose.caddy.yaml`、`Caddyfile` | D1 22:00 | 与 H-13 叠加后 `docker compose config` 无错 |
| — | `docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` 初稿 / 定稿 | D1 22:00 / D2 16:00 | 2 号非作者验证记录 |

本线程接收：H-04（D1 10:30）、H-07（D1 12:00）、H-13（D1 20:00）、H-14（D1 20:00），以及开工前清单 P-01、P-02、P-03、P-05（总览第 2 节）。

## 8. 风险

总览第 9 节为公共风险；下表只列 C 侧特有项。

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| Edge TTS 非官方，可能限流或失效 | AC-06 | primary 与 fallback 同 provider，无法互相兜底；全部失败时只显示字幕（AC-09），审计写明。有 Azure Key 也不在 2 天内接入 |
| VM-1 承载三个容器 + Caddy 证书 | OOM、入口不可用 | 总览 3.2 判定线；先降 tts_fallback 到 192m |
| VM-2 整机故障 | ASR 不可用、健康检查和 VM-2 自身备份不可用 | TTS 由 fallback 接管；ASR 降级到文本输入（AC-10）；VM-2 配置以 git + 密码管理器恢复（§5.3） |
| Docker 端口绕过 ufw | 内网服务暴露 | 绑定地址 + NSG；管理端直连测试必须失败（§6） |
| NSG 默认放行同 VNet | 来源限制失效 | C-01 核实；显式拒绝规则；内部令牌 |
| NSG 或 ufw 修改导致 SSH 断连 | 失去访问 | 2 天内不执行 `--firewall`；NSG 改动先放行 22；拥有者在场；串行控制台兜底 |
| 证书申请失败 | AC-02 | 总览 R-08 |
| 审计文件泄露地址或令牌 | 安全 | 提交前执行 v1 C 计划 §9.3 扫描；地址只写占位符 |
| 云 ASR 费用 | 成本 | 免费层额度（需验证）；并发 2；单次 ≤ 30 s |
| D1 晚间 VM-2 部署未完成 | CP5 | D2 09:00 先补 VM-2，再做 VM-1；仍未完成时 CP5 只验证文本对话，TTS/ASR 进缓冲时段 |

## 9. 审计

- 文件：
  - `audit/thread_c_audit.{md,json}`，结论一致，格式沿用工作报告 v2；
  - `audit/server_verification/<日期>_c01.{md,json}` 与 `latest_c01.{md,json}`（带时间戳的记录不删）；
  - `audit/thread_c/`：stats 日志、演练记录（已脱敏）。
- JSON 字段沿用 v1 C 计划 §9.2，差异：
  - `servers[]` 只有 `vm1`、`vm2` 两项，`role` 写实际承载的服务；
  - `drills[]` 为 D-1 ~ D-9（编号按总览 8.4，与 v1 不同）；
  - 新增 `schedule{plan:"2day-v1", checkpoints[]{id,passed,notes}}`；
  - `open_items[]` 记录 VM-2 自身备份的局限（§5.3）和 AC-12 文字由“四台”改为“两台”的修订。
- 提交前执行 v1 C 计划 §9.3 的敏感信息扫描，结果写入 `sensitive_scan`。

## 10. 待决事项

| # | 事项 | 何时关闭 |
| --- | --- | --- |
| 1 | 两台是否同一 VNet；NSG 默认是否放行同 VNet | D1 10:30（C-01） |
| 2 | VM-1 三个容器的内存是否在判定线内 | D2 12:00（D-9） |
| 3 | 受限备份密钥是否获得拥有者授权 | D2 13:00 |
| 4 | Caddy 当前版本是否记录 `Authorization` 头 | D2 上午证书签发后查看日志 |
| 5 | 云 ASR 免费层额度 | P-05 到位时 |
| 6 | 旧部署目录 `deploy/vm2-tts/`、`vm3-asr/`、`vm4-fallback/` 是否删除 | 拥有者决定；2 天内不删 |
