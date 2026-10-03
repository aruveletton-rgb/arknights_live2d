# 线程 C 实施计划（v1，2026-10-01）

- 2 天版排期与两台拓扑：[`2day/THREAD_C_2DAY_PLAN.md`](2day/THREAD_C_2DAY_PLAN.md)（任务细节仍以本文为准）
- 负责人：4 号（线程 C：TTS/ASR 语音服务 + 四台服务器部署）
- 上层计划：[`docs/EXECUTION_PLAN.md`](../EXECUTION_PLAN.md)；公共假设、阻塞、交接、周历：[`README.md`](README.md)（下称“总览”；WA-01 ~ WA-12、H-01 ~ H-13）。文中“README §N”指仓库根目录 README
- 现状依据：[工作报告 §3.4](../../audit/reports/2026-10-01-three-thread-work-report.md)：C 未开始；4 × B2ats v2 未登录核实；2026-07-13 审计记录的“服务器拓扑不一致”未关闭
- 状态：草案。D2、D5（10-15）与 D7（10-19）后修订
- 占位符：`<vm1-host>`、`<vm2-private>`、`<admin-src>` 等。本计划不含任何地址、用户名、密钥或订阅链接

## 1. 范围与完成定义

本线程任务：C-01 ~ C-10；交接物 H-02、H-08、H-09、H-11；S4 部署、故障与回滚演练（与 3 号共同执行）。

| AC | C 的责任 | C 侧完成标准 |
| --- | --- | --- |
| AC-02 | VM-1 的 Caddy、证书、防火墙（C-09） | 客户端经 `https://<vm1-host>` 调用 `/api/health` 成功 |
| AC-05 | asr_gateway + VM-3（C-04、C-05） | 经 VM-1 转发的样例 WAV 返回文字；与 A1-10、B 联调通过 |
| AC-06 | tts_gateway + VM-2（C-02、C-03） | 客户端播放经 VM-1 代理的 VM-2 音频 |
| AC-09 | 网关失败时返回可判定的错误（H-02） | 停 VM-2、VM-4 后 orchestrator 返回 `audio_url = null`（降级由 B-06 实现） |
| AC-10 | `ASR_UNAVAILABLE` / `ASR_EMPTY`（C-04） | 停 VM-3 后客户端收到标准错误并切换文本输入 |
| AC-12 | vm2/vm3/vm4 compose，vm1 Caddy 叠加文件 | 四台按文档 `docker compose up -d` 后健康检查全部 ok |
| AC-13 | `scripts/healthcheck.sh`（C-07） | 停任一服务，脚本指出 VM 与服务名，退出码为 2 |
| AC-14 | `SERVER_DEPLOYMENT.md`、`TTS_ASR_GUIDE.md` 正式版（C-10） | 已合并，章节覆盖 §4.10 目录 |
| AC-16 | 部署部分（C-10） | 非作者按文档从零部署一台成功并留记录 |

线程完成定义：

1. C-01 ~ C-10 的验证点都有证据（命令 + 脱敏输出），写入 `audit/thread_c_audit.{md,json}`。
2. D7 有结论；“拓扑不一致”遗留项有关闭记录（C-01）。
3. 每台 VM 有 1 小时资源记录，无 OOM（风险 R3 的结论）。
4. 回滚演练至少在一台 VM 上实际执行一次。
5. 仓库敏感信息扫描无命中（§9.3）。

## 2. 依赖、阻塞与决定前做法

| 依赖 | 截止 | 影响 | 未就绪时怎么继续 |
| --- | --- | --- | --- |
| D1 仓库定位 | 10-08 | 全部 | 按代码仓库方案。若改为说明仓库，同目录结构迁到实现仓库 |
| G-02 嵌套目录迁移 | 10-09 | 占位文件 `server/*/README.md`、`deploy/*/README.md`、`docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` | G-02 合并前只新建这些占位文件以外的文件，不碰嵌套目录 |
| G-06 线程分支 | 10-12 | 提交位置 | 先在个人分支，G-06 后 rebase 到 `thread-c-voice-ops` |
| D2 合同 / H-04 | 10-15 | C-02、C-04 字段 | 按 §6.1（H-02）和 WA-05 ~ WA-07 开发；冻结后只改 `models.py` 与 fixtures（预留 2 h） |
| D5 ASR 路线 | 10-15 | C-04、C-05 | 按 WA-06 做 VM-3 云 ASR 代理。若改为本地 ASR：C-04 只保留 mock 和音频校验作参考，C-05 取消，约 4 h 转入缓冲 |
| D7 服务器资源 | 10-19 | C-03 起的全部部署 | 按 2 vCPU / 1 GiB 设计。C-01 核实规格不同时按 §4.11 重算，VM-1 放在内存最大的一台 |
| D8 鉴权 | 10-15 | H-02 令牌 | 按 WA-08：内部用 `X-Internal-Token`；公网鉴权在 orchestrator，不在 Caddy |
| O-01 云 ASR Key（可选 Azure TTS Key） | 10-19 | C-04 云 provider；VM-4 provider 多样化 | 全部走 mock；云 provider 只写抽象和基于 `httpx.MockTransport` 的单测；VM-4 也用 edge_tts |
| O-02 VM-1 域名 | 10-26 | C-09 | S3 用 `http://<vm1-host>:12393` 内测；见 §4.9 无域名备选 |
| O-03 VM 登录权限、云防火墙（NSG）查看与修改权限（已加入总览 §2） | 10-08 | C-01、C-03 起 | 无权限则 C-01 无法开始，H-09 顺延，当周标为阻塞；W0 只做本机开发 |
| H-07 `voices.yaml` | 10-19 | C-02 真实音色 | 用 `tests/fixtures/voices.test.yaml`（§4.2 格式），同时作为给 2 号的格式提案 |
| H-13 vm1 compose（B-09） | 10-30 | C-07 的 VM-1 行、C-09 | 本机用 Caddy + 返回 health 的占位容器验证 Caddyfile；VM-1 检查行先标 `skip` |
| B-06 TTS 主备切换 | S3 | AC-09、S4 演练 | C 侧提供 `TTS_PROVIDER=mock` + `TTS_MOCK_FAULT=fail` / `hang`，供 B 本机复现故障 |
| A1-10 录音转换 | S3 | AC-05 | 提供 curl 样例与格式错误信息，A1 用 mock ASR 自测 |

## 3. 文件变更清单

路径按 G-02 迁移后的根目录结构。“修改”指 G-02 迁入的占位文件。

| 路径 | 新建/修改 | 任务 ID | 说明 |
| --- | --- | --- | --- |
| `server/tts_gateway/app/`（`main.py`、`config.py`、`models.py`、`errors.py`、`auth.py`、`cache.py`、`voices.py`、`mp3.py`） | 新建 | C-02 | 路由、配置、pydantic 模型、WA-05 错误、内部令牌、缓存、音色表、MP3 帧工具 |
| `server/tts_gateway/app/providers/`（`base.py`、`mock.py`、`edge_tts_provider.py`、`azure_tts.py`） | 新建 | C-02 | provider 抽象；`azure_tts.py` 仅在 O-01 提供 Key 时实现 |
| `server/tts_gateway/tests/`（`test_*.py`、`fixtures/voices.test.yaml`） | 新建 | C-02 | §5.1 |
| `server/tts_gateway/`（`requirements.txt`、`requirements-dev.txt`、`Dockerfile`、`.dockerignore`、`.env.example`） | 新建 | C-02 | 依赖用 `==` 锁定 |
| `server/tts_gateway/README.md` | 修改 | C-02 | 本机运行、变量、mock 模式、测试命令 |
| `server/asr_gateway/app/`（`main.py`、`config.py`、`models.py`、`errors.py`、`auth.py`、`audio.py`、`providers/{base,mock,cloud_*}.py`） | 新建 | C-04 | `cloud_*` 的具体名称由 O-01 决定 |
| `server/asr_gateway/tests/`（`test_*.py`、`fixtures/README.md`、`fixtures/sample_zh_16k.wav`） | 新建 | C-04 | 样例为 4 号自录 3 秒、约 100 KB，来源写在 `fixtures/README.md` |
| `server/asr_gateway/`（requirements、Dockerfile、`.dockerignore`、`.env.example`）、`README.md` | 新建 / 修改 | C-04 | 同 TTS |
| `deploy/vm2-tts/`（`compose.yaml`、`.env.example`）、`README.md` | 新建 / 修改 | C-03 | |
| `deploy/vm3-asr/`（`compose.yaml`、`.env.example`）、`README.md` | 新建 / 修改 | C-05 | |
| `deploy/vm4-fallback/`（`compose.yaml`、`.env.example`、`cron.example`）、`README.md` | 新建 / 修改 | C-06 | 备用 TTS、健康检查与备份的 cron 模板 |
| `deploy/vm1-gateway/Caddyfile`、`deploy/vm1-gateway/compose.caddy.yaml` | 新建 | C-09 | 叠加文件；`compose.yaml`、`.env.example` 属于 B-09，C 不改 |
| `scripts/healthcheck.sh`、`scripts/hosts.example.conf`、`scripts/tests/test_healthcheck.py` | 新建 | C-07 | 真实 `hosts.conf` 不进仓库 |
| `scripts/install_vm.sh`、`scripts/backup_config.sh`、`scripts/update_all.sh` | 新建 | C-08 | |
| `scripts/README.md` | 修改 | C-08 | 用法、授权要求、回滚 |
| `docs/SERVER_DEPLOYMENT.md`、`docs/TTS_ASR_GUIDE.md` | 修改 | C-10 | 正式版 |
| `.gitignore` | 修改（不存在则新建） | C-02 | 追加 `.env`、`**/.env`、`scripts/hosts.conf`、`temp/`；与 G-03 协调，避免冲突 |
| `.github/workflows/voice-ops.yml` | 新建 | C-02、C-07 | ubuntu：两个网关的 pytest、`shellcheck scripts/*.sh`（WA-11，C 独立维护） |
| `audit/server_verification/2026-10-xx_c01.{md,json}`、`latest_c01.{md,json}` | 新建 | C-01 | 已脱敏 |
| `audit/thread_c/`（stats 日志、演练记录） | 新建 | C-03 ~ S4 | 已脱敏 |
| `audit/thread_c_audit.{md,json}` | 新建 | 全部 | §9 |

不改：`character_pack/voices/voices.yaml`（2 号维护，C 只读）、`server/common/`（3 号维护，C 只提样例）、`server/orchestrator/`、客户端。

## 4. 任务实施细节

### 4.1 C-01 服务器核实（D7）

目标：核实 4 台 VM 的规格与网络，关闭“拓扑不一致”遗留项，输出 H-09 第一部分。

步骤：

1. 向拥有者确认 O-03（登录方式、云防火墙/NSG 只读权限）。凭据只放 4 号本机的密钥管理器。
2. 每台执行下列只读命令。原始输出存放在 4 号本机的仓库外目录 `<private-dir>`，不提交。

```bash
nproc; lscpu | grep -E 'Architecture|Model name|^CPU\(s\)'
free -m; swapon --show
df -h /; lsblk -d -o NAME,SIZE,TYPE
uname -a                      # 记录时删去主机名字段
cat /etc/os-release
timedatectl | grep -E 'Time zone|NTP service'
docker --version; docker compose version     # 未安装记为“无”
systemctl list-units --type=service --state=running --no-legend | awk '{print $1}'   # 只记服务名，避免误停
ss -tlnH                      # 已监听端口，记录时只保留端口号
sudo ufw status verbose       # 只读；无 sudo 记“未验证”
ip -br addr                   # 只用于判断各台是否同一私网段，不记录地址
for u in https://speech.platform.bing.com https://pypi.org/simple/ \
         https://registry-1.docker.io/v2/ https://download.docker.com; do
  curl -sS -o /dev/null -m 10 -w "$u %{http_code} %{time_total}s\n" "$u" || echo "$u FAIL"
done                          # 任何 HTTP 码都算可达；云 ASR 端点在 O-01 后补测
```

3. VM-4 上测到其他三台 22 端口的连通性：`nc -zv -w 3 <vmN-private> 22`。只记成功或失败。
4. 拥有者或 4 号在云控制台只读查看 NSG 入站规则，只记“端口 / 来源类别（任意、管理端、某台 VM）”。同时记录 B 系列 CPU 基线与积分指标是否可见（需验证）。
5. 填写记录模板（每台一列），存为 `audit/server_verification/2026-10-xx_c01.md`，内容相同的 JSON 一份，再复制为 `latest_c01.*`。

| 字段 | VM-1 | VM-2 | VM-3 | VM-4 |
| --- | --- | --- | --- | --- |
| 规格名（云控制台） / vCPU / 架构 | | | | |
| 内存 total / available（MiB）；swap | | | | |
| 系统盘大小 / 可用 | | | | |
| OS 版本 / 内核版本 | | | | |
| 时区 / NTP | | | | |
| Docker / Compose 版本 | | | | |
| 已运行的非系统服务（名称） | | | | |
| 已监听端口 | | | | |
| ufw 状态 / NSG 入站摘要 | | | | |
| 出口：Edge TTS / PyPI / Docker Hub / Docker apt | | | | |
| 与其他 VM 同一私网：是 / 否 | | | | |
| 核实时间、核实人 | | | | |

6. 关闭“拓扑不一致”：两种拆法的来源分别是 README §5 / WA-01（VM-2 TTS、VM-3 ASR、VM-4 备用 + 备份 + 健康检查），以及 commit `58572b0` 中 `docs/PROJECT_PLAN.md` §5（PR #1 早期版本，后续提交已删除：VM-2 LLM 适配 + 会话，VM-3 TTS，VM-4 ASR + 静态音频）。LLM 走外部 API（上层计划假设 3），会话在 orchestrator 内存中（B-07），不需要单独一台 LLM 适配 VM。因此，C-01 规格一致时采用 README §5 拓扑。结论写入 C-01 记录的“决定”段，3 号在 PR 中确认后，审计 `open_items` 标记为 closed。规格不一致（例如某台内存更大）时，把 VM-1 放在内存最大的一台，只改映射，不改拓扑。

产出：C-01 记录（MD + JSON）；D7 结论草案。验证：§9.3 的脱敏扫描无命中；3 号确认。完成标准：4 列全部填完，或标“未验证 + 原因”。工时 4 h。依赖：O-03。

### 4.2 C-02 tts_gateway

目标：本机可运行，含 mock，交付 H-08（10-19）。

目录：

```text
server/tts_gateway/
├─ app/
│  ├─ main.py          # FastAPI：/api/health、POST /api/tts、GET /api/audio/{audio_id}.mp3
│  ├─ config.py        # 读 WA-10 环境变量；INTERNAL_TOKEN 为空时拒绝启动
│  ├─ models.py        # TTSRequest / TTSResponse / HealthResponse / ErrorBody（pydantic v2）
│  ├─ errors.py        # WA-05 错误对象与异常处理
│  ├─ auth.py          # X-Internal-Token，hmac.compare_digest
│  ├─ cache.py         # 落盘、TTL、LRU、single-flight
│  ├─ voices.py        # voices.yaml 读取与 emotion 微调
│  ├─ mp3.py           # 帧头解析求时长；静音帧生成
│  └─ providers/{base,mock,edge_tts_provider,azure_tts}.py
├─ tests/  requirements.txt  requirements-dev.txt  Dockerfile  .env.example  README.md
```

步骤：

1. 接口按 §6.1（H-02）实现。请求校验：`text` 去首尾空白后 1 ~ `TTS_MAX_TEXT_CHARS`（默认 300）字；`speed` 0.5 ~ 2.0；未知 `emotion` 改为 `neutral`（WA-04）；未知 `voice_id` 改用 `default_voice_id` 并记 warning。
2. `audio_id` 由网关计算，orchestrator 不重算：`sha256("{voice_id}|{speed:.2f}|{emotion}|{text}")` 取前 32 位十六进制。四个值都是回退和规范化（NFC、strip）之后的值。
3. provider 抽象（`providers/base.py`）：

```python
class TTSProvider(Protocol):
    name: str                                    # 写入响应 provider 和 /api/health
    async def synthesize(self, text: str, voice: ResolvedVoice) -> bytes: ...   # 返回 MP3；失败抛 ProviderError
```

| provider | 实现要点 | 外部依赖 |
| --- | --- | --- |
| `mock` | 不联网。拼接 MPEG-2 Layer III 静音帧（24 kHz、48 kbps、单声道，帧头 `FF F3 64 C0`，帧长 144 字节，每帧 24 ms，其余字节为 0），时长 = clamp(字数 × 120 ms, 500, 10000)。`TTS_MOCK_FAULT=none\|fail\|hang` 供演练（WA-10）。帧头常量在实现时用 `ffprobe` 和 Chromium `<audio>` 验证（需验证） | 无 |
| `edge_tts` | 使用 Python 包 `edge-tts`（rany2/edge-tts）：`Communicate(text, voice, rate=…, pitch=…)`，用流式接口收集音频块。输出 MP3（Edge 常用格式为 24 kHz 单声道，需验证）。该端点不支持自定义 SSML 风格（需验证），emotion 只映射为 rate/pitch 微调。版本锁定到实施时最新稳定版并记录在 requirements.txt | Edge 在线服务，非官方 |
| `azure`（可选） | O-01 提供 Key 才做。用 httpx 调 Azure Speech TTS REST，SSML + `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`；不引入 SDK，镜像更小。部分音色支持 `mstts:express-as` 风格（需验证） | Azure Speech 资源 |

4. `duration_ms`：`mp3.py` 解析帧头，按帧数和采样率计算，不依赖 ffmpeg。
5. 缓存（`cache.py`）：
   - 落盘：`$TTS_CACHE_DIR/{audio_id}.mp3`，元数据放在 `{audio_id}.json`（duration_ms、provider、created_at）。先写 `.tmp`，再用 `os.replace` 原子替换。
   - 命中时用 `os.utime` 刷新 mtime，作为 LRU 依据。
   - TTL：`TTS_CACHE_TTL_H`（默认 72）。启动时清理一次，之后每 10 分钟后台清理一次。
   - 容量：总量超过 `TTS_CACHE_MAX_MB`（默认 200）时，按 mtime 从旧到新删除，降到上限的 80%。
   - 并发：同一 `audio_id` 用 `asyncio.Lock` 做 single-flight，provider 只调用一次。全局 `asyncio.Semaphore(TTS_MAX_CONCURRENCY=4)`，排队超过 2 秒返回 `OVERLOADED`。
   - TTS 缓存可以重新生成，不备份。
6. `voices.py`：读 `VOICE_MAP_FILE`。2 号的 H-07 未到时使用下面的格式提案（2 号确认后定稿）。文件缺失或格式错误时拒绝启动，并给出清楚的报错：

```yaml
version: 1
default_voice_id: arknights_fan_default
voices:
  arknights_fan_default:
    provider_voices: {edge_tts: zh-CN-XiaoyiNeural, azure: zh-CN-XiaoyiNeural}   # 以 `edge-tts --list-voices` 实际输出为准
    rate: "+0%"
    pitch: "+0Hz"
    emotion:                      # 可选；未列出的 emotion 不微调
      smile:   {rate: "+5%",  pitch: "+2Hz"}
      worried: {rate: "-5%",  pitch: "-1Hz"}
      sad:     {rate: "-10%", pitch: "-2Hz"}
```

   最终 rate = 基础 rate + emotion 微调 + (speed − 1) × 100%，限制在 −50% ~ +100%。只使用 provider 提供的通用音色，不做声音克隆（README §19）。
7. 超时与错误：provider 调用 `TTS_TIMEOUT_S`（默认 5 秒，须短于 orchestrator 的 `TTS_CALL_TIMEOUT_S` 6 秒，WA-12），网关内不重试，由 orchestrator 切到 VM-4（B-06）。provider 异常或超时返回 503 `TTS_UNAVAILABLE`。日志不记录原文全文，只记录 `audio_id`、字数、耗时和 provider。
8. `/api/health` 不调用 provider：缓存目录不可写或配置无效时为 `down`；最近 5 分钟 provider 失败率 ≥ 50% 时为 `degraded`；其他情况为 `ok`。
9. Dockerfile：`python:3.11-slim`，非 root 用户，`pip install --no-cache-dir -r requirements.txt`，用 `python -c "urllib.request…"` 做 HEALTHCHECK（slim 镜像没有 curl），`uvicorn app.main:app --host 0.0.0.0 --port 8082 --workers 1`。

产出：`server/tts_gateway/` 全部文件。验证：

```bash
cd server/tts_gateway && pip install -r requirements-dev.txt && pytest -q
TTS_PROVIDER=mock INTERNAL_TOKEN=dev VOICE_MAP_FILE=tests/fixtures/voices.test.yaml uvicorn app.main:app --port 8082
curl -s -H "X-Internal-Token: dev" -H "Content-Type: application/json" \
  -d '{"text":"博士，今天也辛苦了。","voice_id":"arknights_fan_default","emotion":"smile","speed":1.0}' \
  http://127.0.0.1:8082/api/tts        # 连续两次：第二次 cache_hit=true，耗时明显更短
docker build -t arknights/tts_gateway:dev server/tts_gateway
```

完成标准：§5.1 的 TTS 用例全部通过；mock 模式不联网可运行；`edge_tts` 在本机真实合成 1 句（`pytest -m network`，结果记入审计）。工时 10 h。依赖：H-02 定稿；H-07（可用测试 fixture 替代）。

### 4.3 C-03 VM-2 部署

步骤：

1. 拥有者授权后，在 VM-2 执行 `install_vm.sh --role vm2 --apply`（C-08a）。
2. `git clone` 到 `/opt/arknights`，checkout 指定 tag。`cp deploy/vm2-tts/.env.example deploy/vm2-tts/.env`，填写 `INTERNAL_TOKEN`、`BIND_ADDR`（VM-2 私网地址）、`IMAGE_TAG`（git 短 SHA）。
3. `compose.yaml` 要点：`build: ../../server/tts_gateway`、`image: arknights/tts_gateway:${IMAGE_TAG}`、`ports: ["${BIND_ADDR}:8082:8082"]`（不绑 `0.0.0.0`，原因见 §4.12）、具名卷 `tts_cache:/data/cache`、只读挂载 `character_pack/voices/voices.yaml`、`mem_limit: 256m`、`restart: unless-stopped`、`logging: json-file max-size 10m max-file 3`。
4. `docker compose up -d --build`，然后从 VM-1 与 VM-4 调用 `/api/health` 和一次 `/api/tts`。
5. 1 小时资源测量（§4.11）。

验证：`docker compose ps` 显示 healthy；VM-1 上 curl `/api/tts` 返回 200；从管理端直连 8082 失败（证明端口未对公网开放）。完成标准：1 小时无 OOM，`OOMKilled=false`，`RestartCount=0`，stats 日志存入 `audit/thread_c/`。工时 3 h。依赖：C-01、C-02、C-08a、O-03。

### 4.4 C-04 asr_gateway

步骤：

1. 接口按 §6.1，目录结构与 tts_gateway 相同（`app/main.py`、`audio.py`、`providers/`）。uvicorn 单 worker，端口 8083。
2. `audio.py` 用标准库 `wave` 校验，顺序如下，任一项失败都返回 400 `BAD_REQUEST`，message 写明具体原因：
   - 字段 `file` 存在；读取不超过 1,048,576 字节，超出立即停止读取；
   - RIFF/WAVE、PCM（`wave` 只接受 PCM）；
   - 单声道、16 bit（sampwidth = 2）、16000 Hz；
   - 时长 = nframes / 16000 ≤ 30 秒；
   - `language` 在白名单内（默认 `zh-CN`；其余由 provider 支持情况决定）。
   - 30 秒 16 kHz 16 bit 单声道约 960 KB，符合 1 MB 上限。
3. provider 抽象：`async def recognize(wav: bytes, language: str) -> ASRResult(text, confidence)`。
   - `mock`：用 `array` 计算 RMS，低于阈值返回空文本，即 `ASR_EMPTY`；否则返回 `ASR_MOCK_TEXT`（默认“博士，今天有什么任务？”）。支持 `ASR_MOCK_FAULT=none|fail|hang`。
   - 云 provider：由 O-01 的账号决定，先只写抽象和 `httpx.MockTransport` 单测。若为 Azure：短音频 REST 接口接受 WAV/PCM 16 kHz 单声道，单次最长 60 秒，需要 `language` 查询参数；`RecognitionStatus` 的 `Success` 映射为文本，`NoMatch`、`InitialSilenceTimeout`、`BabbleTimeout` 映射为 `ASR_EMPTY`，`Error`、5xx、401/403、超时映射为 `ASR_UNAVAILABLE`（401/403 只写日志，不把细节返回客户端）。`format=detailed` 时取 `NBest[0].Confidence`。其他厂商写对应映射表，需验证。
4. 超时 `ASR_TIMEOUT_S`（默认 10 秒），并发上限 `ASR_MAX_CONCURRENCY=2`。
5. 隐私：不落盘音频，日志只记录字节数、时长、耗时和状态，不记录识别文本。音频会发给第三方云服务，这一点交给 2 号写入 `VOICE_POLICY.md`。

验证：`pytest -q`；`curl -H "X-Internal-Token: dev" -F file=@tests/fixtures/sample_zh_16k.wav -F language=zh-CN http://127.0.0.1:8083/api/asr`。完成标准：§5.1 的 ASR 用例全部通过；O-01 就绪时用样例 WAV 实测云识别一次，并记入审计。工时 7 h（mock + 校验 4 h，云 provider 3 h）。依赖：H-02、D5、O-01（仅云 provider）。

### 4.5 C-05 VM-3 部署

与 C-03 相同：`deploy/vm3-asr/compose.yaml`，端口 `${BIND_ADDR}:8083`，`mem_limit: 256m`，不挂数据卷。`.env` 填写 `ASR_PROVIDER`、`ASR_API_KEY`（真实值只放 VM 上的 `.env`，权限 600）。验证：VM-1 上 `/api/health` 为 ok；用样例 WAV 调一次 `/api/asr`；1 小时资源测量。工时 2 h。依赖：C-01、C-04、C-08a。

### 4.6 C-06 VM-4：备用 TTS、备份、健康检查

1. 备用 TTS：`deploy/vm4-fallback/compose.yaml` 使用与 VM-2 相同的 `IMAGE_TAG`，端口 `${BIND_ADDR}:8082`，`mem_limit: 256m`，缓存卷各自独立。provider 默认 `edge_tts`。O-01 提供 Azure Key 时，VM-4 改用 `azure`，避免两台依赖同一上游（R-02）。
2. 备份（`backup_config.sh`，C-08b）：

| 项 | 内容 | 频率 | 保留 |
| --- | --- | --- | --- |
| 部署配置 | `deploy/<vm>/`（不含 `.env`）、`Caddyfile`、`.release`（当前/上一个 tag 与 git SHA） | 每日 03:30 + 每次更新前 | VM-4 保留 14 份；各台本地保留 3 份 |
| `.env` | 不备份明文。只记录键名列表和每个值的 `sha256` 前 8 位，用于发现漂移。真实值保存在拥有者的密码管理器中 | 同上 | 同上 |
| 系统配置 | `ufw status numbered`、`/etc/docker/daemon.json`、crontab、`swapon --show` | 同上 | 同上 |
| 镜像清单 | `docker image ls --format '{{.Repository}}:{{.Tag}}'` | 同上 | 同上 |
| 容器日志 | 最近 24 h `docker compose logs`（应用日志本身不含原文和令牌），gzip 压缩 | 每日 | 7 份 |
| 不备份 | TTS 缓存（可再生）、`caddy_data` 中的私钥、音频、`.env` 明文 | — | — |

   传输：VM-4 用专用只读密钥拉取，对端 `authorized_keys` 写成 `restrict,command="…/backup_config.sh --emit"`，只能执行这一条命令。新增密钥需要拥有者授权；未授权时只做本地备份，4 号每周手动取回一次。恢复步骤（写入 C-10）：解包 → 从密码管理器回填 `.env` → `docker compose up -d` → healthcheck。
3. 定时任务（`deploy/vm4-fallback/cron.example`）：`*/5 * * * * healthcheck.sh -c /opt/arknights/hosts.conf -q >> /var/log/arknights/health.log 2>&1`，并写入最近状态文件 `health.latest`。logrotate 保留 7 天。MVP 不做告警推送；需要时另行决定渠道。

验证：停 VM-2 的 tts 容器后，经 VM-1 的 `/api/chat` 仍返回 `audio_url`，且 URL 中的节点为 `vm4`（与 B-06 联调）；`tar -tzf` 显示备份包不含 `.env`，`env.keys` 每行只有“键名 + 8 位哈希”；在 VM-4 上演练恢复一次。工时 4 h。依赖：C-02、C-07、C-08b。

### 4.7 C-07 `scripts/healthcheck.sh`

- 输入：`-c <hosts.conf>`（默认 `/opt/arknights/hosts.conf`，`.gitignore` 排除）。仓库只提交 `scripts/hosts.example.conf`：

```text
# vm   service        url
vm1    orchestrator   https://<vm1-host>/api/health
vm2    tts_gateway    http://<vm2-private>:8082/api/health
vm3    asr_gateway    http://<vm3-private>:8083/api/health
vm4    tts_gateway    http://<vm4-private>:8082/api/health   # 端口只绑私网地址，127.0.0.1 不通
```

- 选项：`-t <秒>` 单项超时（默认 5，curl `--connect-timeout 3 --max-time 5`）；`-q` 只输出非 ok 项和汇总。依赖 bash、curl、python3（解析 JSON）；缺少依赖时退出码为 3。
- 判定：HTTP 200 且 JSON `status=ok`、`service` 与配置一致 → `ok`；`status=degraded` → `degraded`；`status=down`、非 200、超时、连接拒绝、JSON 无效或 `service` 不一致 → `down`。orchestrator 的 `llm/tts/asr` 字段原样放进 detail。
- 输出（每台每服务一行，最后一行汇总）：

```text
2026-11-04T10:00:00+08:00 vm1 orchestrator ok       http=200 1.12s llm=ok tts=degraded asr=ok
2026-11-04T10:00:01+08:00 vm2 tts_gateway  down     http=000 5.00s timeout
2026-11-04T10:00:01+08:00 vm3 asr_gateway  ok       http=200 0.08s provider=mock
2026-11-04T10:00:01+08:00 vm4 tts_gateway  ok       http=200 0.02s provider=edge_tts
SUMMARY ok=3 degraded=0 down=1 failed=vm2/tts_gateway
```

- 退出码：0 全部 ok；1 有 degraded、无 down；2 有 down；3 配置或依赖错误。
- 运行位置：VM-4 的 cron（可以访问所有私网地址）；管理端只能检查 VM-1。

验证：`shellcheck scripts/*.sh`、`bash -n`；`scripts/tests/test_healthcheck.py` 起本地桩服务（ok / degraded / 500 / 挂起 / service 不一致），断言输出行和退出码；S4 时逐台停服务实测（§5.4）。工时 4 h。依赖：C-03、C-05；VM-1 行依赖 B-09。

### 4.8 C-08 安装、备份、更新脚本

三个脚本共同规则：`set -euo pipefail`；默认 dry-run，只打印将要执行的命令；`--apply` 才执行，并要求 `--approved-by <name>`，写入 `/var/log/arknights/ops.log`。不输出任何 `.env` 值。

C-08a `install_vm.sh --role vm1|vm2|vm3|vm4`（2.5 h）：

1. 检查 OS 与 C-01 记录一致，不一致时退出。
2. 按 Docker 官方 apt 仓库安装 Docker Engine 和 compose 插件（已安装则跳过）。
3. 建部署用户和 `/opt/arknights`、`/var/log/arknights`。
4. swap：没有 swap 且磁盘可用 ≥ 5 GiB 时，建 1 GiB `/swapfile`，`vm.swappiness=10`（WA-02）。
5. 防火墙只在加 `--firewall` 时执行：先打印当前规则，先确认放行 22，再按 §4.12 加规则，最后才 `ufw enable`；禁止 `ufw reset`。执行前需要拥有者在场，并确认可用云控制台串行终端兜底（防止 SSH 断连）。
6. 可重复执行，第二次运行无变化。

C-08b `backup_config.sh --emit|--pull|--local`（1.5 h）：内容见 §4.6 备份表。`--emit` 只把打包结果写到 stdout，供 VM-4 受限密钥调用。

C-08c `update_all.sh --tag <tag>`（2 h）：

1. 顺序：VM-4 → VM-2 → VM-3 → VM-1（先更新备用 TTS，主 TTS 更新期间由备用顶上）。
2. 每台：在 `.release` 记录当前 tag → `git fetch && git checkout <tag>` → `IMAGE_TAG=<sha> docker compose up -d --build` → 60 秒内轮询 `/api/health`。
3. 失败：checkout 回上一个 tag，用仍在本地的旧镜像 `up -d`（不重新构建），停止后续 VM，退出码 2。
4. 每个服务只保留最近 2 个 tag 的镜像（`docker image ls` 按 tag 筛选后删除更早的镜像）。

验证：`shellcheck`；`scripts/tests/test_ops_dryrun.py` 断言 dry-run 输出不含令牌和地址、`backup_config.sh --local` 的包不含 `.env`；S4 在一台 VM 上故意部署一个健康检查失败的 tag，确认自动回滚（演练 D-6）。工时合计 6 h。依赖：C-01。

### 4.9 C-09 VM-1 HTTPS（Caddy）

`deploy/vm1-gateway/Caddyfile`：

```text
{$VM1_DOMAIN} {
    encode gzip
    request_body {
        max_size 2MB
    }
    reverse_proxy orchestrator:12393
    header -Server
    log {
        output stdout
        format json
    }
}
```

`compose.caddy.yaml`：服务 `caddy`（`caddy:2` 镜像，实施时锁定具体版本），`ports: ["80:80", "443:443"]`，卷 `caddy_data`、`caddy_config`，只读挂载 `Caddyfile`，`mem_limit: 96m`，`restart: unless-stopped`。启动命令见 WA-10。

- 证书：Caddy 自动 HTTPS，需要 `VM1_DOMAIN` 的 DNS 指向 VM-1，NSG 放行 80 和 443。80 只用于 ACME 校验和跳转（已写入 WA-08）。
- 日志：Caddy 默认不记录 `Authorization` 头的值（需验证当前版本行为）；不开 `log_credentials`。
- O-02 未就绪：S3 用 `http://<vm1-host>:12393`，NSG 来源限定为团队 IP；S4 前如仍无域名，用 sslip.io 类域名申请证书（需拥有者同意）。
- 公网鉴权仍在 orchestrator（B-08），Caddy 不做鉴权。

验证：`curl -sS https://<vm1-host>/api/health`；`curl -sI http://<vm1-host>/` 返回 308；`openssl s_client -connect <vm1-host>:443 -servername <vm1-host> </dev/null | openssl x509 -noout -issuer -dates`；从公网访问 12393 失败。完成标准：客户端用 https 地址对话成功（AC-02）。工时 3 h。依赖：B-09（H-13）、O-02。

### 4.10 C-10 正式文档

`docs/SERVER_DEPLOYMENT.md` 目录：1 架构与端口表；2 前置条件（O-03、域名、Key）；3 每台 VM 从零部署（`install_vm.sh` → clone → `.env` → `compose up` → 验证）；4 防火墙与 NSG 矩阵（§4.12）；5 健康检查；6 更新与回滚；7 备份与恢复；8 故障排查表（症状 → 检查命令 → 处理）；9 资源与调参（§4.11）；10 安全注意事项（不提交 `.env`、令牌轮换步骤）。

`docs/TTS_ASR_GUIDE.md` 目录：provider 切换；`voices.yaml` 字段；内部接口摘要（链接 §6.1）；缓存与清理；mock 与故障注入；ASR 音频格式与错误码；合规（链接 `VOICE_POLICY.md`）。

验证：非作者（3 号或 2 号）只看文档，在一台 VM 上从零部署，记录耗时和卡住的步骤，4 号据此修订（AC-16 部署部分）。工时：4 号 4 h，非作者 2 h（记入对方工时）。依赖：C-07、C-08。

### 4.11 内存预算与资源测量

| VM | 容器（mem_limit） | 预计常驻（未实测） | 系统 + Docker（未实测） | 合计上限 |
| --- | --- | --- | --- | --- |
| VM-1 | orchestrator 256m、caddy 96m | 约 80 + 30 MiB | 约 300 MiB | < 700 MiB |
| VM-2 | tts_gateway 256m | 约 80 MiB | 约 300 MiB | < 600 MiB |
| VM-3 | asr_gateway 256m | 约 70 MiB | 约 300 MiB | < 600 MiB |
| VM-4 | tts_gateway 256m；cron 脚本 | 约 80 MiB | 约 300 MiB | < 600 MiB |

每台另配 1 GiB swap（C-08a）。测量方法（每台 1 小时，结果存 `audit/thread_c/<vm>_stats_<date>.log`，复制到本地前脱敏）：

```bash
( for i in $(seq 60); do date -Is; docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}'; sleep 60; done ) > stats.log &
for i in $(seq 360); do curl -s -o /dev/null -w '%{http_code} %{time_total}\n' <本台业务请求>; sleep 10; done > latency.log
docker inspect --format '{{.Name}} OOMKilled={{.State.OOMKilled}} Restarts={{.RestartCount}}' $(docker ps -q)
free -m
```

同时观察延迟是否随时间上升（B 系列 CPU 积分耗尽的迹象；积分指标能否在控制台看到需验证）。

### 4.12 防火墙矩阵

| VM | 端口 | 允许来源 | 控制层 |
| --- | --- | --- | --- |
| VM-1 | 22 | `<admin-src>` | NSG + ufw |
| VM-1 | 80、443 | 任意 | NSG + ufw |
| VM-1 | 12393 | 仅 S3 内测：团队 IP；之后关闭 | NSG；compose 正式环境绑 `127.0.0.1` |
| VM-2 | 8082 | VM-1、VM-4 | NSG；compose 绑私网地址 |
| VM-3 | 8083 | VM-1、VM-4 | NSG；compose 绑私网地址 |
| VM-4 | 8082 | VM-1 | NSG；compose 绑私网地址 |
| VM-2/3/4 | 22 | `<admin-src>`；VM-4（受限密钥拉备份） | NSG + ufw |
| 全部 | 出站 | 任意（Edge TTS、云 ASR、LLM、PyPI、Docker Hub） | — |

Docker 发布的端口不经过 ufw 的规则（WA-08），8082/8083 只能靠绑定地址和 NSG 控制。Azure NSG 默认规则通常放行同一 VNet 内的流量（需在 C-01 核实）；要只允许 VM-1、VM-4 访问，必须加显式拒绝规则，内部令牌作为第二层。

## 5. 测试计划

### 5.1 单元测试（pytest）

| 模块 | 文件 | 要点 |
| --- | --- | --- |
| tts | `test_validation.py` | 字数 0/1/300/301；`speed` 边界；未知 emotion → `neutral`；未知 voice → 默认音色 |
| tts | `test_audio_id.py` | 规范化规则；固定输入的期望值（`tests/fixtures/audio_id_vectors.json`） |
| tts | `test_cache.py` | 原子写入；TTL 清理；超上限降到 80%；同一 `audio_id` 并发 10 次只调 provider 1 次 |
| tts | `test_auth.py` | 缺令牌、错令牌 401；`/api/health` 免令牌 |
| tts | `test_errors.py` | provider 失败、超时 → 503 `TTS_UNAVAILABLE`；排队超时 → 503 `OVERLOADED`；`TTS_MOCK_FAULT` |
| tts | `test_mp3.py` | 按帧数求时长；静音帧帧头 |
| tts | `test_voices.py` | 格式校验；缺文件拒绝启动；rate 合成后的上下限 |
| tts | `test_audio_get.py` | 存在 → 200 `audio/mpeg`；不存在 → 404 `AUDIO_NOT_FOUND`；`audio_id` 不是 32 位十六进制 → 404（防路径穿越） |
| asr | `test_audio_validation.py` | 每种失败原因一个用例：缺字段、> 1 MB、非 RIFF、立体声、8 bit、44.1 kHz、> 30 s、未知 language |
| asr | `test_mock.py` | 静音 → `ASR_EMPTY`；有声 → `ASR_MOCK_TEXT`；`ASR_MOCK_FAULT` |
| asr | `test_cloud_mapping.py` | `httpx.MockTransport`：各 `RecognitionStatus`、401/403/5xx、超时 |
| asr | `test_privacy.py` | 请求后无临时文件；日志无识别文本 |
| scripts | `test_healthcheck.py`、`test_ops_dryrun.py` | §4.7、§4.8 |

真实网络用例标 `@pytest.mark.network`，CI 中跳过，本机手动跑并记入审计。

### 5.2 合同测试

3 号把 H-02 的内部接口写成 `server/common/schemas/internal_tts.json`、`internal_asr.json`（B-02）。C 的测试用 `jsonschema`（仅 dev 依赖）校验网关响应。H-04 之前用本地副本，之后删除。

### 5.3 本机联调（S3）

uvicorn 本机起 4 个进程：orchestrator 12393、tts 8082（主）、tts 8084（模拟 VM-4）、asr 8083。orchestrator 设 `TTS_PRIMARY_URL=http://127.0.0.1:8082`、`TTS_FALLBACK_URL=http://127.0.0.1:8084`、`ASR_GATEWAY_URL=http://127.0.0.1:8083`。用 `TTS_MOCK_FAULT` 复现 IT-05，用停进程复现 IT-06。命令写入 `docs/TTS_ASR_GUIDE.md`。

### 5.4 S4 演练（与 3 号共同执行）

| ID | 操作 | 期望 | 证据 |
| --- | --- | --- | --- |
| D-1 | 停 VM-2 的 tts 容器 | `audio_url` 节点为 `vm4`；healthcheck 报 vm2 down，退出码 2 | 命令输出 |
| D-2 | 再停 VM-4 的 tts | `audio_url = null` + `TTS_UNAVAILABLE`；客户端只显示字幕 | 输出 + 截图 |
| D-3 | 停 VM-3 的 asr | `/api/asr` 返回 503 `ASR_UNAVAILABLE`；客户端切到文本 | 输出 + 截图 |
| D-4 | 停 orchestrator 30 s 后恢复 | 客户端自动恢复 | 时间戳 |
| D-5 | 重启一台 VM | 容器自动启动，health 为 ok | `uptime`、`compose ps` |
| D-6 | 部署健康检查会失败的 tag | `update_all.sh` 自动回滚 | `ops.log` |
| D-7 | 备份恢复 | 在 VM-4 按 C-10 恢复一台的配置 | 记录 |
| D-8 | 每台 1 小时资源 | 无 OOM | stats 日志 |

## 6. 对外交付与 Mock

### 6.1 H-02 内部接口提案（10-12 交 3 号，D2 时并入合同）

除 `/api/health` 外，所有请求都必须带 `X-Internal-Token`。错误体为 `{"error": {"code", "message"}}`（WA-05）。

`POST /api/tts`（VM-2、VM-4，端口 8082）：

```json
// 请求
{"text": "博士，今天也辛苦了。", "voice_id": "arknights_fan_default", "emotion": "smile", "speed": 1.0}
// 200 响应
{"audio_id": "3f9a…（32 位十六进制）", "audio_path": "/api/audio/3f9a….mp3", "duration_ms": 2400,
 "provider": "edge_tts", "voice_id": "arknights_fan_default", "emotion": "smile", "cache_hit": false}
```

- 响应里的 `voice_id`、`emotion` 是回退后的实际值，便于排查。
- 错误：400 `BAD_REQUEST`（字数、`speed` 越界）；401；503 `TTS_UNAVAILABLE`（provider 失败或超时）；503 `OVERLOADED`。

`GET /api/audio/{audio_id}.mp3`：200 `audio/mpeg`，`Cache-Control: public, max-age=86400`；不存在或格式不对 → 404 `AUDIO_NOT_FOUND`。是否支持 Range 取决于 Starlette 版本，需验证；orchestrator 代理时转发 `Range` 头。

`GET /api/health`：见 WA-07，1 秒内返回，不调 provider。

`POST /api/asr`（VM-3，端口 8083）：`multipart/form-data`，字段 `file`、`language`（格式同 WA-06）。

```json
{"text": "博士，今天有什么任务？", "provider": "azure", "confidence": 0.91, "error": null}
{"text": "", "provider": "azure", "confidence": null, "error": {"code": "ASR_EMPTY", "message": "未识别到语音"}}
```

- 错误：400 `BAD_REQUEST`（message 写明哪一项格式不对）；401；503 `ASR_UNAVAILABLE`。

orchestrator 处理规则（B-06、B-10 实现）：503、超时、连接失败视为节点失败，TTS 切到 VM-4；400 不重试，也不切换节点。

### 6.2 交付表

| ID | 内容 | 截止 | 验收方式 |
| --- | --- | --- | --- |
| H-02 | §6.1 | 10-12 | 3 号在 PR 中确认 |
| H-08 | tts_gateway 本机可运行（mock + edge_tts） | 10-19 | 3 号按 README 启动，`/api/tts` 返回音频 |
| H-09 | C-01 记录；VM-1 已装 Docker | 10-12；10-23 | 3 号确认记录；VM-1 上 `docker compose version` |
| H-11 | asr_gateway 本机可运行（mock） | 10-23 | 1、3 号用样例 WAV 调用成功 |
| — | `*_MOCK_FAULT` 故障注入 | 随 H-08、H-11 | 3 号本机复现 IT-05、IT-06 |

本线程接收：H-04（10-15）、H-07（10-19）、H-13（10-30）、O-01、O-02、O-03。

## 7. 周计划（4 号，单位 h，目标每周约 10 h）

| 周 | 任务 | h |
| --- | --- | --- |
| W0（假期，可选） | H-02 草稿 2；C-01（O-03 到位才做）4 | 2 ~ 6 |
| W1 | C-01（W0 未做时）4；H-02 定稿 1；C-08a 2.5；C-02 开始 2 | 9.5 |
| W2 | C-02 8（H-08）；D2 修订 1 | 9 |
| W3 | C-03 3（同时在 VM-1 执行 `install_vm.sh`，H-09 第二部分）；C-04 7（H-11） | 10 |
| W4（S3） | C-05 2；C-06 4；C-07 4；S3 集成 2；C-08b 1.5 | **13.5** ⚠ |
| W5（S4） | C-08c 2；C-09 3；C-10 4；S4 演练 4（与 3 号分担）；D2 修订 1 | **14** ⚠ |
| W6（S5） | C-10 按非作者反馈修订 1；审计 3；取证 1 | 5 |
| 合计 | （C-01 在 W0 做时，W1 相应减 4 h） | 63 |

W4、W5 超标，按序削减：

1. O-01 无云 ASR Key 时，C-04 只做 mock 和校验（−3 h），C-05 提前到 W3；
2. C-08b 只做本地备份，不做 VM-4 远程拉取（−1 h）；
3. C-09 的 Caddyfile 在 W4 前用本机占位容器提前验证，W5 只做上线（−1 h）；
4. S4 演练 D-4、D-6 由 3 号执行（−2 h）；
5. C-10 的非作者验证由 2 号执行（已计入 2 号工时，见总览 §7）。

全部执行后 W4 约 10.5 h、W5 约 11 h；第 1 条只在没有云 ASR Key 时适用。

## 8. 风险与回退

| ID | 风险 | 影响 | 回退 |
| --- | --- | --- | --- |
| R-01 | O-03 未授予 | C-01 起全部部署顺延 | 本机开发与 mock 先行；周报标阻塞；S4 顺延 |
| R-02 | Edge TTS 非官方，可能限流或失效 | AC-06 | VM-4 改用 Azure（O-01）；全部失败时只显示字幕（AC-09） |
| R-03 | 1 GiB 内存、B 系列 CPU 积分 | OOM、延迟上升 | swap、`mem_limit`、并发上限；§4.11 实测 |
| R-04 | Docker 端口绕过 ufw | 内网服务暴露 | `BIND_ADDR` + NSG；管理端直连测试必须失败 |
| R-05 | NSG 默认放行同 VNet 流量 | 来源限制失效 | C-01 核实；加显式拒绝规则；内部令牌兜底 |
| R-06 | 修改防火墙导致 SSH 断连 | 失去访问 | 先放行 22；拥有者在场；串行控制台兜底；禁止 `ufw reset` |
| R-07 | 证书申请失败（无域名、80 未放行） | AC-02 https | HTTP 内测；sslip.io 备选 |
| R-08 | 审计文件泄露地址或令牌 | 安全 | §9.3 扫描；只写占位符 |
| R-09 | 云 ASR 产生费用 | 成本 | 免费层额度（需验证）；并发 2；单次 ≤ 30 s |
| R-10 | W4、W5 超时 | 进度 | §7 削减顺序 |

## 9. 审计输出

### 9.1 文件

- `audit/thread_c_audit.{md,json}`：结论一致，格式沿用工作报告 v2。
- `audit/server_verification/2026-10-xx_c01.{md,json}` 与 `latest_c01.{md,json}`：带时间戳的记录不删，`latest_*` 指向最新一次。
- `audit/thread_c/`：stats 日志、演练记录（已脱敏）。

### 9.2 JSON 字段

`report_format`、`thread: "c"`、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`servers[]{vm,role,spec_verified,docker,health,peak_mem_mib,oom}`、`drills[]{id,result,evidence}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`（含“拓扑不一致”的关闭记录）、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。

### 9.3 敏感信息扫描（提交前执行）

```bash
git grep -nIE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b|BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}' \
  -- audit/ deploy/ scripts/ docs/ server/ ':!*.example' ':!*.example.conf'
```

期望只命中 `127.0.0.1`、`0.0.0.0` 或版本号类误报，每条人工确认后写入 `sensitive_scan.hits`。

## 10. 对公共假设的修订建议

| # | 建议 | 处理 |
| --- | --- | --- |
| 1 | 阻塞表增加 O-03 | 已采纳（总览 §2，截止改为 10-08） |
| 2 | WA-10 补充 TTS/ASR 变量与部署变量 | 已采纳；原提的 `*_MOCK_MODE` 改为 `*_MOCK_FAULT`，mock 开关统一用 `*_PROVIDER=mock` |
| 3 | `audio_id` 规范化规则，由网关计算 | 已采纳（WA-06） |
| 4 | 内部接口状态码 | 已采纳（WA-05） |
| 5 | 内网端口只绑私网地址 | 已采纳（WA-08） |
| 6 | VM-1 用 `compose.caddy.yaml` 叠加 | 已采纳（WA-10） |
| 7 | 80 端口用于 ACME 与跳转 | 已采纳（WA-08） |
| 8 | 新增 `AUDIO_NOT_FOUND` | 已采纳（WA-05） |
| 9 | `TTS_TIMEOUT_S` 默认 5 s，短于 orchestrator 的单节点超时 | 已采纳（WA-12） |
| 10 | 新增 `VM1_DOMAIN` | 已采纳（WA-10） |
| 11 | `voices.yaml` 格式 | 以 2 号 H-07 确认为准（WA-09） |
| 12 | CI 用独立的 `voice-ops.yml` | 已采纳（WA-11） |
| 13 | NSG 是否默认放行同 VNet 流量 | 未决：C-01 核实后决定是否在 WA-08 写明显式拒绝规则 |
