# 线程 A 实施计划（v1，2026-10-01）

- 2 天版排期：[`2day/THREAD_A_2DAY_PLAN.md`](2day/THREAD_A_2DAY_PLAN.md)（任务细节仍以本文为准）
- 负责人：1 号（A1 客户端 + Live2D）、2 号（A2 角色包 + 合规）
- 上层计划：[`docs/EXECUTION_PLAN.md`](../EXECUTION_PLAN.md)；公共假设、阻塞表、交接物：[`README.md`](README.md)（下称“总览”；WA-01~WA-12、H-01~H-13）。文中“README §N”指仓库根目录 README
- 现状依据：`audit/reports/2026-10-01-three-thread-work-report.md`
- 状态：草案。D2 冻结（10-15）后按 `docs/API_CONTRACT.md` v1.0 修订
- 路径：一律为 G-02 迁移后的根目录路径。下文 `client/` = `upstream/Open-LLM-VTuber/client/`

## 1. 范围与完成定义

| AC | 内容 | A1 任务 | A2 任务 | 本线程完成标准 |
| --- | --- | --- | --- | --- |
| AC-01 | 桌宠可启动 | A1-01、A1-02、A1-11 | — | 安装包在干净 Windows 上启动；透明、置顶、拖动、托盘有截图 |
| AC-02 | 连接 VM-1 | A1-05、A1-06 | — | 填 https 地址和令牌后对话成功（依赖 B-09、C-09） |
| AC-03 | 加载 Live2D | A1-07 | A2-04、A2-05 | 样例模型渲染，缩放和位置生效 |
| AC-04 | 文本回复 | A1-04 | A2-02、A2-03 | 对本机 orchestrator（H-10）对话成功 |
| AC-05 | 语音回复 | A1-10 | — | 录音 → `/api/asr` → `/api/chat` 成功（H-11） |
| AC-06 | TTS 播放 | A1-09 | voices.yaml（H-07） | 播放 `audio_url`，口型跟随 |
| AC-07 | 按 emotion 切表情 | A1-03、A1-08 | A2-04 | 8 个表情逐个录屏 |
| AC-08 | 按 motion 播动作 | A1-03、A1-08 | A2-04 | 7 个动作逐个录屏 |
| AC-09 | TTS 失败只显示字幕 | A1-04、A1-09 | — | `audio_url=null` 或播放失败时无错误提示，状态回到 idle |
| AC-10 | ASR 失败切文本 | A1-10 | — | 停 ASR 后提示并聚焦输入框 |
| AC-11 | 断线重连 | A1-06 | — | 停后端 → 显示断线 → 恢复后自动可用（按 WA-07 HTTP 轮询解释，时限见 §10） |
| AC-14 | 文档完整（A 部分） | 技术文档 | 角色包文档 | §3 文档行全部更新 |
| AC-15 | 合规说明 | — | A2-05、A2-06 | `ASSET_SOURCE_TABLE.md`、`VOICE_POLICY.md`、`LICENSE_NOTICE.md` 已合并 |
| AC-16 | 非技术用户可用（客户端） | A1-11 | 用户说明 | 非作者按 `docs/DESKTOP_PET_MODE.md` 安装并完成一次对话 |

另负责治理任务 G-02、G-03、G-08（1 号）。

完成定义：

1. CI（windows-latest）上 `npm run typecheck`、`npm run build`、`npm test` 通过；
2. 上表每个 AC 有证据（截图、录屏记录、命令输出）；没有证据写 `unverified`；
3. 仓库内无官方素材、无 Cubism Core、无样例模型文件、无 `.env` 或令牌；
4. 提交 `audit/thread_a1_audit.{md,json}`、`audit/thread_a2_audit.{md,json}`（§9）。

不在范围：WebSocket（除非 D3 改选）、基于 `/api/characters` 的角色选择界面、自动更新、代码签名、macOS/Linux 打包。

## 2. 依赖、阻塞与决定前做法

| 依赖 | 截止 | 影响任务 | 未就绪时怎么继续 |
| --- | --- | --- | --- |
| G-01 / D1 仓库定位 | 10-08 | G-02 | 在个人分支先完成迁移脚本与校验；D1 选说明仓库时，把同一套 `git mv` 结果推到新实现仓库 |
| G-02 迁移 | 10-09 | A1、A2 全部 | 迁移前不在嵌套目录开新改动；A1-01 修法在临时副本验证，迁移后再提交 |
| G-06 线程分支 | 10-12 | 提交 | 先用 `fix/…`、`feat/…` 个人分支，G-06 后 rebase 到 `thread-a-desktop` / `thread-a-character` |
| D2 合同（H-04） | 10-15 | A1-03~05、A2-01~03 | 按 WA-03~WA-05 实现；fixtures 先放 `client/tests/fixtures/`，H-04 后改读 `server/common/fixtures/` |
| D3 传输 | 10-15 | A1-06 | 按 WA-07 HTTP 退避轮询；若改 WebSocket，保留 `ConnectionMonitor` 对外接口，只换内部实现 |
| D5 ASR 路线 | 10-15 | A1-10 | 按 WA-06 走 VM-1 `/api/asr`；若改本地 ASR，只替换 `asrClient.ts` |
| D6 模型来源 | 10-19 | A1-07/08、A2-04 | Live2D 官方免费样例只放本机、不提交；正式模型到位只改 `model_dict.json` |
| D8 鉴权 | 10-15 | A1-05 | 按 WA-08 发 `Authorization: Bearer`；令牌为空时不发该头，后端未启用鉴权也能联调 |
| D9 许可证 | 10-08 | A2-06 | 按默认 MIT 起草 `LICENSE_NOTICE.md`，D9 后改措辞 |
| H-10 orchestrator mock | 10-20 | A1-04/06 联调 | 客户端 Mock + 合同 fixtures 单测先行；联调顺延，不阻塞单测 |
| H-11 asr_gateway | 10-23 | A1-10 联调 | `mockAsrClient` + WAV 编码单测；IT-03/06 顺延到 W5 |
| B-09、C-09 VM-1 https | 10-30 后 | AC-02 | S3 用 `http://127.0.0.1:12393`；S4 再连 https |
| O-01 LLM Key | 10-19 | A2-03 实测 | 用 mock LLM 检查 Prompt 格式；10 轮实测在 Key 到位后补 |
| Cubism Core 许可登记 | 10-12 | A1-07、A1-11 | 登记前只在本机试验；登记前不打进任何安装包 |

## 3. 文件变更清单

| 路径 | 新建/修改 | 任务 | 说明 |
| --- | --- | --- | --- |
| `arknights-desktop-pet-vtuber_thread-a1_organized/**` → 根目录 | 移动 | G-02 | `git mv`，映射见 §4 G-02 |
| `arknights-desktop-pet-vtuber_thread-a1_organized.zip` | 删除 | G-02 | 先提取 2 个 `.env.example` |
| `.env.example`、`client/.env.example` | 新建（从 zip 提取） | G-02、A1-05、A1-10 | 原只含 `VITE_MOCK_CHAT`，A1-10 加 `VITE_MOCK_ASR`；注释中的端口改 12393 |
| `.gitignore` | 新建 | G-02、A1-07 | `node_modules/`、`dist/`、`release/`、`.env`、Core、样例模型 |
| `.gitattributes`、`.editorconfig` | 新建 | G-03 | LF、UTF-8 |
| `.github/workflows/client.yml` | 新建 | G-08 | windows-latest：typecheck、build、test（WA-11） |
| `client/package.json` | 修改 | A1-01、A1-07、A1-11 | 脚本；`pixi.js`、`pixi-live2d-display` 精确版本；vite 移入 devDependencies |
| `client/package-lock.json` | 新建 | A1-01 | `npm ci` 需要 |
| `client/vitest.config.ts` | 新建 | A1-01 | `root: "."`，`environment: "node"` |
| `client/vite.config.ts` | 修改 | A1-11 | `base: "./"`（`file://` 下资源路径） |
| `client/src/main/index.ts` | 修改 | A1-01 | `window-all-closed` 去参数；单实例锁提前返回 |
| `client/src/main/window.ts` | 修改 | A1-02、A1-09、A1-10 | 关窗改隐藏；`autoplayPolicy`；麦克风权限处理 |
| `client/src/renderer/index.html` | 修改 | A1-07 | 在 bundle 前加载本机 Cubism Core，缺失时不报错 |
| `client/scripts/prune-unlicensed-assets.mjs` | 新建 | A1-11 | 打包前删除未登记素材和 Core |
| `client/src/renderer/types/character.ts` | 修改 | A1-03 | 冻结枚举 + normalize |
| `client/src/renderer/types/chat.ts` | 修改 | A1-04 | `text`、`session_id`、`character_id`、`error` |
| `client/src/renderer/api/parseChatResponse.ts` | 新建 | A1-04 | 响应校验与兼容 |
| `client/src/renderer/api/chatClient.ts` | 修改 | A1-04、A1-05 | 令牌头；错误对象；`globalThis.setTimeout` |
| `client/src/renderer/api/mockChatClient.ts` | 修改 | A1-04 | 冻结枚举、降级样例 |
| `client/src/renderer/api/healthClient.ts`、`connection/ConnectionMonitor.ts` | 新建 | A1-06 | 健康检查与退避 |
| `client/src/renderer/api/asrClient.ts`、`api/mockAsrClient.ts` | 新建 | A1-10 | `/api/asr` |
| `client/src/renderer/audio/wavEncoder.ts`、`audio/VoiceRecorder.ts` | 新建 | A1-10 | 16 kHz 单声道 WAV |
| `client/src/renderer/audio/AudioPlayer.ts` | 修改 | A1-09 | `crossOrigin`、AnalyserNode |
| `client/src/renderer/config/defaultConfig.ts`、`clientConfig.ts`、`session.ts`（新） | 修改/新建 | A1-05 | 端口、角色、令牌、会话 UUID、旧默认值迁移 |
| `client/src/renderer/live2d/*.ts`、`modelDict.ts`（新）、`live2dMapping.ts`（新） | 修改/新建 | A1-07~09 | 渲染、映射、口型 |
| `client/src/renderer/App.tsx`、`components/*.tsx` | 修改 | A1-04~10 | 接线；连接状态；麦克风按钮；设置项 |
| `client/scripts/sync-character-pack.mjs` | 新建 | A1-07 | 本机复制 `model_dict.json` 与本机模型到 `public/characters/` |
| `client/tests/*.test.ts`、`client/tests/fixtures/*.json` | 新建/修改 | 各 A1 任务 | 见 §5 |
| `docs/DESKTOP_PET_MODE.md`、`LIVE2D_IMPORT.md`、`API_CONTRACT_ALIGNMENT.md`、`INTEGRATION_GAP_REPORT.md`、`client/README.md` | 修改 | A1 各任务、AC-14/16 | 与实现同步；用户安装说明 |
| `character_pack/ENUM_PROPOSAL.md` | 新建 | A2-01 | H-01 |
| `character_pack/characters/arknights_fan_001.yaml`、`characters/README.md` | 新建/修改 | A2-02 | 角色配置 + 字段说明 |
| `character_pack/prompts/{persona,speech_style,emotion_rules,livestream_rules,copyright_boundary}.md` | 新建 | A2-03 | 5 个 Prompt |
| `character_pack/prompts/tests/dialogue_cases.md` | 新建 | A2-03 | 10 轮实测用例与结果 |
| `character_pack/live2d-models/README.md` | 修改 | A2-04 | 开发模型表情、动作对照表 |
| `character_pack/live2d-models/model_dict.json` | 新建 | A2-04 | 开发版，含 `motionMap` |
| `character_pack/voices/voices.yaml` | 新建 | H-07 | 与 4 号对齐 |
| `character_pack/ASSET_SOURCE_TABLE.md` | 新建 | A2-05 | 素材登记 |
| `docs/VOICE_POLICY.md`、`docs/LICENSE_NOTICE.md` | 新建/修改 | A2-06 | 合规 |
| `character_pack/knowledge/*.md` | 新建 | A2-07 | 原创概述 |
| `audit/thread_a1_audit.*`、`audit/thread_a2_audit.*`、`audit/evidence/thread_a*/` | 新建 | §9 | 审计 |

不修改：`docs/API_CONTRACT.md`（3 号维护）、`server/`、`deploy/`、`scripts/`。

## 4. 任务实施细节

### G-02 嵌套目录迁移（1 号，3 h，依赖 G-01）

- 目标：仓库只有一套结构，历史可追溯，不丢文件。
- 步骤：
  1. 新建 `chore/flatten-thread-a1`；`git status` 确认干净。
  2. 从 zip 提取 2 个 `.env.example` 到 `.env.example`、`client/.env.example`（已确认只含 `VITE_MOCK_CHAT`，无密钥）。
  3. 按目录 `git mv`：`upstream/`、`character_pack/`、`deploy/`、`server/`、`scripts/`、`docs/*` → 根目录同名位置；`audit/*` → `audit/`；嵌套 `README.md` → `docs/archive/THREAD_A1_PACKAGE_README.md`；`ORGANIZATION_REPORT.md` → `audit/ORGANIZATION_REPORT.md`（根 `README.md` 不覆盖）。
  4. 删除已有内容目录下的 `.gitkeep`；`git rm` zip；新建根 `.gitignore`（§4 A1-07 给出条目）。
  5. `git grep -n "thread-a1_organized"`，修正文档中的旧路径。
- 验证：

```bash
git ls-files | grep -c "thread-a1_organized"   # 期望 0
git log --follow --oneline -- upstream/Open-LLM-VTuber/client/src/main/index.ts
node -e "const m=require('./audit/source_manifest.json'),c=require('crypto'),{execSync}=require('child_process');let ok=0;for(const f of m.files){const b=execSync('git show HEAD:'+f.destination);if(c.createHash('sha256').update(b).digest('hex')===f.destination_sha256)ok++}console.log(ok+'/'+m.files.length)"
```

- 完成标准：嵌套目录和 zip 不存在；manifest 33/33（仅对迁移提交有效，后续改源码后哈希变化属预期）。

### G-03 换行与编码（1 号，1 h，依赖 G-02）

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.moc3 binary
*.mp3 binary
*.wav binary
*.zip binary
*.ico binary
*.bat text eol=crlf
*.cmd text eol=crlf
```

- `.editorconfig`：`root=true`；`charset=utf-8`、`end_of_line=lf`、`insert_final_newline=true`；TS/JSON/YAML/MD 缩进 2，Python 4。
- 执行 `git add --renormalize .` 后提交。现有工作区不做 `reset --hard`；验证用全新克隆：`git clone -b <branch> <url> temp/verify` 后跑上面的 manifest 脚本（读工作区文件版本）期望 33/33，完成后删除 `temp/verify`。

### G-08 客户端 CI（1 号，2 h，依赖 G-02、A1-01）

```yaml
name: client
on:
  pull_request:
    paths: ["upstream/Open-LLM-VTuber/client/**", "server/common/fixtures/**", ".github/workflows/client.yml"]
jobs:
  build-test:
    runs-on: windows-latest
    defaults: { run: { working-directory: upstream/Open-LLM-VTuber/client } }
    env: { ELECTRON_SKIP_BINARY_DOWNLOAD: "1" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm, cache-dependency-path: upstream/Open-LLM-VTuber/client/package-lock.json }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

- 需验证：Electron 34 是否仍识别 `ELECTRON_SKIP_BINARY_DOWNLOAD`；本机实测用的是 Node 25.9.0，CI 固定 Node 22 LTS 后需重跑一次。
- 完成标准：PR 上 check 为绿；fixtures 变更也会触发（合同测试）。

### A1-01 修构建（1 号，2.5 h，依赖无）

1. `src/main/index.ts`：

```ts
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("ready", () => { /* 原逻辑 */ });
}
// 订阅即阻止默认退出；退出只走托盘“退出”
app.on("window-all-closed", () => {});
```

2. 新建 `vitest.config.ts`（vitest 优先读取它，不再继承 vite 的 `root`）：

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { root: ".", include: ["tests/**/*.test.ts"], environment: "node" } });
```

3. `package.json` 脚本：

```json
"build:main": "tsc -p tsconfig.main.json",
"typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.main.json --noEmit",
"dev": "npm run build:main && concurrently -k \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
"build": "npm run build:main && vite build",
"test": "vitest run"
```

4. 生成并提交 `package-lock.json`（当前不存在，`npm ci` 需要）。
- 验证：`npm run typecheck`、`npm run build`、`npm test`（期望 3 文件 6 用例通过）；全新克隆 `npm ci && npm run dev` 弹出窗口（手工）。
- 完成标准：三条命令退出码 0；窗口截图。

### A1-02 实测桌宠窗口（1 号 0.5 h + 2 号 1 h 截图，依赖 A1-01）

- 代码审阅发现：`window.ts` 未拦截 `close`，Alt+F4 会销毁窗口，托盘菜单随后操作已销毁对象。修法：

```ts
let quitting = false;
app.on("before-quit", () => { quitting = true; });
window.on("close", (e) => { if (!quitting) { e.preventDefault(); window.hide(); } });
```

- `styles.css` 中 `.pet-stage` 整块是 `drag-region`，会吞掉 Live2D 画布的点击（tapMotions）。决定：拖动手柄改为 topbar，舞台 `no-drag`；写入 `docs/DESKTOP_PET_MODE.md`。
- 需验证：Windows 上 `transparent: true` 与 `resizable: true` 同时开启的表现。
- 检查清单：透明背景、置顶、拖动、托盘显示/隐藏/退出、Alt+F4 后托盘仍可恢复、第二实例聚焦已有窗口。每项截图存 `audit/evidence/thread_a1/`。

### A1-03 枚举白名单与回退（1 号，2 h，依赖 D2；按 WA-04 先做）

`types/character.ts` 改为冻结枚举，合同枚举与客户端内部状态分开：

```ts
export const EMOTIONS = Object.freeze(["neutral","smile","serious","worried","sad","surprised","thinking","confident"] as const);
export const MOTIONS = Object.freeze(["idle","greeting","nod","shake","think","encourage","battle_ready"] as const);
export type Emotion = (typeof EMOTIONS)[number];
export type Motion = (typeof MOTIONS)[number];
const EMOTION_SET: ReadonlySet<string> = new Set(EMOTIONS);
export function normalizeEmotion(v: unknown): Emotion {
  return typeof v === "string" && EMOTION_SET.has(v) ? (v as Emotion) : "neutral";
}
// normalizeMotion 同理，回退 "idle"
export type CharacterState = "idle" | "thinking" | "speaking" | "error"; // 仅客户端内部
```

- 大小写敏感、不 trim。B 侧对 LLM 输出先 `strip().lower()` 再出口校验（WA-09），客户端收到的都是规范值。旧类型 `CharacterExpression`、`CharacterMotion` 删除，引用改为 `Emotion`、`Motion`。
- `CharacterStateMachine`：删除 `emotionToState`；`userMessageSent` → `thinking/thinking/think`；`requestFailed` → `state=error, expression=worried, motion=idle`；`speakingStarted` 不再写 `motion: "speak"`；无音频回复时 `state=speaking` 直到定时回 idle。
- 测试：`tests/enums.test.ts`（8 个合法值原样返回、未知值、`""`、`null`、`undefined`、数字、`"Smile"`、数组不可修改）；改 `tests/stateMachine.test.ts` 为新枚举。

### A1-04 合同对齐（1 号，4 h，依赖 D2；按 WA-03/05 先做）

`types/chat.ts`：

```ts
export interface ChatRequest {
  session_id: string; character_id: string; input_type: "text" | "voice"; text: string;
  enable_tts: boolean; client_state?: { current_motion: Motion; language: string };
}
export interface ApiError { code: string; message: string }
export interface ChatResponse {
  session_id: string; character_id: string; text: string; emotion: Emotion; motion: Motion;
  audio_url: string | null; duration_ms: number | null; error: ApiError | null;
}
```

`api/parseChatResponse.ts`：`parseChatResponse(raw: unknown, req: ChatRequest): ChatResponse`

- `text = raw.text ?? raw.reply_text`（`reply_text` 只在过渡期保留，D2 后删）；两者都不是字符串 → 抛 `ChatClientError("BAD_RESPONSE")`。
- `session_id`、`character_id` 存在且与请求不同 → 抛错；缺失 → 用请求值并 `console.warn`（过渡期）。
- `emotion`、`motion` 经 normalize；`audio_url` 非字符串 → `null`；`duration_ms` 非数字 → `null`。
- `error` 只接受 `{code: string, message: string}` 或 `null`；其他形状 → `null`。未知字段忽略。

`api/chatClient.ts`：令牌非空时加 `Authorization: Bearer <token>`；非 2xx 解析 `{"error":{code,message}}`，抛 `ChatClientError(code, status)`；`window.setTimeout` 改 `globalThis.setTimeout`（可在 node 环境测试）。

| code | 客户端行为 |
| --- | --- |
| `null` | 正常显示 |
| `TTS_UNAVAILABLE` | 只显示字幕，不显示错误（AC-09） |
| `LLM_UNAVAILABLE` / `LLM_BAD_OUTPUT` | 正常显示兜底文本，字幕下方小字“回复为兜底内容” |
| `UNAUTHORIZED` | “令牌无效，请在设置中检查”，打开设置 |
| `CHARACTER_NOT_FOUND` | “角色不存在：<id>” |
| `RATE_LIMITED` / `OVERLOADED` | “服务繁忙，请稍后重试”，显示重试按钮 |
| 其他 / `INTERNAL` | 显示 `message` |
| 内部 `NETWORK` / `TIMEOUT` | 通知 `ConnectionMonitor.reportFailure()`（A1-06） |

- Mock：8 条回复覆盖 8 个 emotion 和 7 个 motion；另含 1 条 `TTS_UNAVAILABLE`、1 条未知枚举（演示回退）；Mock 输出也经 `parseChatResponse`。
- `App.tsx`：读 `response.text`；`audioBase64` 只作为播放器能力保留，不进合同类型。
- 测试：`tests/parseChatResponse.test.ts`、`tests/chatClient.test.ts`、`tests/mockChatClient.test.ts`、`tests/contract.test.ts`（§5）。

### A1-05 会话、默认值、令牌（1 号，2 h，依赖 D2、D8；按 WA-01/08 先做）

- 新建 `config/session.ts`：`getOrCreateSessionId()`，键 `arknights-vtuber-pet.session.v1`，首次 `crypto.randomUUID()`；与设置分开存，“恢复默认设置”不换会话。
- `defaultConfig.ts`：`backendBaseUrl: "http://127.0.0.1:12393"`、`characterId: "arknights_fan_001"`、新增 `clientToken: ""`、`modelName: "arknights_fan_model"`、`modelPath` 改为 `modelPathOverride: ""`（A1-07）。`requestTimeoutMs` 由 15000 改为 30000（WA-12）。
- `clientConfig.ts`：`migrateLegacyDefaults()`：已保存值等于旧默认 `http://127.0.0.1:8000` 或 `operator_default` 时替换为新默认；用户自定义值不动。
- `SettingsPanel`：新增“访问令牌”（`type="password"`、`autoComplete="off"`）和“角色 ID”。令牌不写日志、不进审计。
- 风险登记：令牌存 localStorage，本机同用户可读（WA-08 已接受，MVP）。
- 测试：`tests/session.test.ts`（首次生成、二次复用、UUID 格式）；`tests/config.test.ts` 加默认值、旧值迁移、自定义值保留。

### A1-06 连接状态与自动重连（1 号，3 h，依赖 D3、H-10 联调）

- `api/healthClient.ts`：`GET {base}/api/health`，不带令牌，超时 3 s；`ok`/`degraded` → 可用（`degraded` 显示“语音服务降级”），`down`、非 200、超时 → 不可用。
- `connection/ConnectionMonitor.ts`：

```ts
type ConnStatus = "online" | "degraded" | "offline" | "checking";
const BACKOFF_S = [1, 2, 4, 8, 16, 30]; // WA-07，之后保持 30
class ConnectionMonitor {
  constructor(check: () => Promise<"ok" | "degraded" | "down">, timers = globalThis) {}
  start(): void; stop(): void; reportFailure(): void; checkNow(): void;
  onChange(cb: (s: ConnStatus) => void): () => void;
}
```

- 启动时检查一次；在线时每 30 s 检查一次（不发消息也能发现断线）；断线后按退避轮询，间隔按“开始到开始”计。恢复后状态 `online`，发送按钮恢复。
- UI：topbar 徽标“在线/降级/断线（重试中）/Mock”，`aria-live="polite"`；断线时发送按钮禁用并显示“立即重试”。Mock 模式停止监控。
- 验证：fake timers 单测；手工：停 orchestrator → 30 s 内显示断线 → 重启 → 自动恢复，记录时间戳。

### A1-07 Live2D 渲染（1 号，6 h，依赖 A1-01、H-06；W2 先做 1.5 h 兼容性试验）

| 方案 | 优点 | 风险 |
| --- | --- | --- |
| `pixi-live2d-display`（guansss）+ `pixi.js` | 高层 API（`Live2DModel.from`、`motion()`、`expression()`），支持 Cubism 2.1/3/4 模型；新版本已迁移到 Pixi v7（来自 release 说明） | 上游维护不活跃；Cubism 5 模型兼容性未验证；需要与 peer 依赖的 pixi.js 主版本严格匹配 |
| 社区分支（如 `pixi-live2d-display-advanced`，Pixi v8 另有独立引擎） | 维护较新 | 来源分散，API 可能与原版不同，需逐项验证 |
| 官方 Cubism SDK for Web | 官方支持，跟进 Cubism 5 | 渲染循环、模型加载、动作管理都要自己写，估计多 15 h |

推荐：先用 `pixi-live2d-display` 的 Cubism 4 路线。W2 试验在 Electron 34 + Vite 6 上加载官方样例模型，通过后按 `npm view pixi-live2d-display peerDependencies` 的结果锁定 `pixi.js` 精确版本。试验失败时改用社区分支；分支也失败时再评估官方 SDK，并在周报中说明 AC-03/07/08 顺延。

Cubism Core 处理：

- 各开发者在 Live2D 官网接受许可后下载 `live2dcubismcore.min.js`，放到 `client/public/vendor/`（`.gitignore` 排除）。仓库不提交 Core，也不提交样例模型。
- `index.html` 在 bundle 前用普通 `<script src="./vendor/live2dcubismcore.min.js">` 加载。文件缺失时 `Live2DRenderer` 检测 `window.Live2DCubismCore` 不存在，回退到现有 CSS 占位角色并显示“未安装 Cubism Core”。
- 能否随安装包分发 Core，取决于 SDK 发布许可（个人或小规模事业者的条件需由 2 号核对官网条款，未验证）。登记完成前，安装包不含 Core（A1-11 的 prune 脚本负责）。

模型文件：

- `scripts/sync-character-pack.mjs`：把 `character_pack/live2d-models/model_dict.json` 和本机模型目录（`ARKNIGHTS_LOCAL_MODELS`，默认 `../local-models`，仓库外）复制到 `public/characters/`。`public/characters/*` 除 `placeholder_operator/` 外都进 `.gitignore`。
- `live2d/modelDict.ts`：

```ts
export interface ModelEntry {
  modelPath: string;                 // 相对路径，如 "characters/dev_model/dev_model.model3.json"（WA-09）
  scale: number;
  initialPosition: { anchor: "bottom-right" | "bottom-left"; offsetX: number; offsetY: number };
  defaultExpression: string;
  emotionMap: Partial<Record<Emotion, string>>;                     // emotion → model3.json 里的表情名
  motionMap: Partial<Record<Motion, { group: string; index: number }>>;
  tapMotions: Motion[];
}
export async function loadModelDict(url = "./characters/model_dict.json"): Promise<Record<string, ModelEntry>>;
export function pickModel(dict: Record<string, ModelEntry>, name: string, override?: string): ModelEntry | null;
```

- `Live2DRenderer` 改为持有 PIXI `Application`（透明背景 `backgroundAlpha: 0`），`load()` 调 `Live2DModel.from(entry.modelPath)`，按 `scale` 和 `initialPosition` 定位；窗口尺寸变化时重新定位。
- `vite.config.ts` 设 `base: "./"`（A1-11 一并验证 `file://` 下资源路径）。
- 验证：`tests/modelDict.test.ts`；手工：样例模型显示，改 `scale` 生效，截图。完成标准：模型可见、透明背景无黑框；缺 Core 或缺模型时回退占位角色并提示。

### A1-08 表情与动作映射（1 号，4 h，依赖 A1-07、H-06）

- 新建 `live2d/live2dMapping.ts`：

```ts
export function resolveExpression(entry: ModelEntry, e: Emotion): string {
  return entry.emotionMap[e] ?? entry.emotionMap.neutral ?? entry.defaultExpression;
}
export function resolveMotion(entry: ModelEntry, m: Motion): { group: string; index: number } | null {
  return entry.motionMap[m] ?? entry.motionMap.idle ?? null;
}
export function validateEntry(entry: ModelEntry, model3: unknown): string[]; // 返回缺失项列表，加载时 console.warn
```

- `ExpressionController.apply(e)` 调 `model.expression(resolveExpression(...))`；`MotionController.play(m)` 调 `model.motion(group, index, priority)`。`idle` 用低优先级，回复动作用普通优先级打断 idle（优先级常量名需按所选库验证）。
- `tapMotions`：点击模型命中区域时随机播放其中一个。A1-02 已把舞台改成 `no-drag`，点击才能到达画布。
- 开发版加调试面板（`import.meta.env.DEV` 才显示）：8 个表情、7 个动作按钮，用于录屏取证。
- 验证：`tests/live2dMapping.test.ts`；手工：逐个触发 8 个表情、7 个动作并录屏（2 号协助）。完成标准：15 段录屏都有记录（§9 证据规则）；映射缺失时回退，不抛错。

### A1-09 口型（1 号，3 h，依赖 A1-07）

- `AudioPlayer`：`audio.crossOrigin = "anonymous"`（需要 `/api/audio/*` 返回 CORS 头，WA-08）；首次播放时创建 `AudioContext`、`MediaElementAudioSourceNode` 和 `AnalyserNode`（`fftSize = 1024`），每个 `Audio` 元素只创建一次 source。
- `LipSyncController`：去掉随机数，改为每帧读 `getFloatTimeDomainData` 求 RMS；`level = clamp((rms - 0.02) * 6, 0, 1)`，上升平滑 0.5、下降平滑 0.2（参数需实测调整）。在模型更新之后写 `ParamMouthOpenY`，避免被动作覆盖。
- 回退：播放中连续 1 秒 RMS 恒为 0（跨域音频被静音）时，切回随机口型并 `console.warn` 一次。
- `window.ts`：`webPreferences.autoplayPolicy = "no-user-gesture-required"`（需验证 Electron 34 仍支持），否则首次自动播放会被拦截。
- `audio_url` 为相对路径时，以 `backendBaseUrl` 为基准解析。
- AC-09：`onError` 不再显示错误，只 `console.warn`；状态在字幕显示后按定时回到 idle。
- 验证：`tests/lipSync.test.ts`（RMS → level 映射、平滑、阈值）；手工：有声嘴动、静音闭合、停 TTS 后无错误提示。

### A1-10 语音输入（1 号，5 h，依赖 D5、H-11 联调；按 WA-06 先做）

- `audio/VoiceRecorder.ts`：`getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` + `MediaRecorder`；按一次开始、再按一次结束，`Esc` 取消；显示计时，30 秒自动停止；短于 0.5 秒丢弃。
- 转换：录音 Blob → `decodeAudioData` → `OfflineAudioContext(1, ceil(duration × 16000), 16000)` 重采样 → `audio/wavEncoder.ts` 的 `encodeWav16(samples: Float32Array, sampleRate = 16000): ArrayBuffer`（PCM 16 bit、单声道、44 字节头）。结果超过 1 MB 时截断到 30 秒。
- `api/asrClient.ts`：

```ts
export async function transcribe(wav: ArrayBuffer, opts: { baseUrl: string; token: string; language?: string }):
  Promise<{ text: string; provider: string; confidence: number | null }>;
```

  - `multipart/form-data`：`file`（`audio.wav`，`audio/wav`）+ `language`（默认 `zh-CN`），带令牌，超时 20 s（WA-12）。
  - 200 且 `text` 非空 → 以 `input_type: "voice"` 调 `/api/chat`；200 + `ASR_EMPTY` → “没有听清，请再说一次”；503 `ASR_UNAVAILABLE`、网络错误、超时 → “语音服务不可用，已切换到文字输入”，聚焦输入框，麦克风按钮禁用 60 s；400 → 显示 `message`；401 → 同 A1-04。
- `api/mockAsrClient.ts`：`VITE_MOCK_ASR=true` 时 300 ms 后返回固定文本。
- 麦克风权限：`session.setPermissionRequestHandler` 只允许本应用页面的 `media` 请求，其他一律拒绝。`file://` 与 `http://127.0.0.1` 应视为安全上下文（需验证）。拒绝权限时提示并切换到文本输入。
- 验证：`tests/wavEncoder.test.ts`、`tests/asrClient.test.ts`；手工：正常识别一次；停 asr_gateway 后提示并聚焦输入框（AC-10）。导出一段客户端生成的 WAV 给 4 号，作为 asr_gateway 的格式样例。

### A1-11 Windows 打包（1 号，4 h + 2 号 2 h 干净机器验证，依赖 A1-01）

- `package.json`：`vite`、`@vitejs/plugin-react` 移到 `devDependencies`（renderer 已打包，运行时不需要）；`"package": "npm run build && node scripts/prune-unlicensed-assets.mjs && electron-builder --win nsis"`。
- `prune-unlicensed-assets.mjs`：删除 `dist/renderer/characters/` 下除 `placeholder_operator/` 以外的内容，删除 `dist/renderer/vendor/live2dcubismcore*`；只有在 `ASSET_SOURCE_TABLE.md` 登记 Core 可分发之后，才允许用 `ALLOW_CUBISM_CORE=1` 保留。删除后列出剩余文件，供审计。
- 没有代码签名，安装时 SmartScreen 会警告，`DESKTOP_PET_MODE.md` 写明处理步骤。
- `docs/DESKTOP_PET_MODE.md` 用户部分（2 号起草初稿）：安装、首次运行、填后端地址和令牌、麦克风权限、托盘、放置本机 Core 与模型、卸载。
- 验证：在 Windows Sandbox 或干净 VM 上安装、启动、对话、卸载，并截图；`npx asar list` 确认安装包内无 Core 和样例模型。完成标准：非作者（2 号）按文档完成一次对话（AC-16 客户端部分）。

### A2-01 枚举提案（2 号，2 h，依赖无，H-01 10-12）

`character_pack/ENUM_PROPOSAL.md`：两张表（emotion 8 行、motion 7 行），列为“值 | 含义 | 典型触发场景 | 示例台词 | 模型缺资源时的近似”。示例：`worried` | 担心 | 用户说累、受挫 | “博士，先休息一下吧。” | 近似 `sad`。PR 中请 1、3 号确认，确认后作为 D2 输入，值与 WA-04 一致，不新增。

### A2-02 角色 YAML（2 号，3 h，依赖 A2-01，H-05 10-19）

`character_pack/characters/arknights_fan_001.yaml`（路径相对 `character_pack/`，WA-09）：

```yaml
character_id: arknights_fan_001        # 必须与文件名一致
character_name: Rhodes Fan Operator
display_name: 罗德岛风格同人桌宠
human_name: 博士
live2d_model_name: arknights_fan_model # model_dict.json 的键
voice_id: arknights_fan_default        # voices.yaml 的键
fallback_reply: 博士，通讯似乎有些不稳定。不过我还在这里。
prompt_files:
  - prompts/persona.md
  - prompts/speech_style.md
  - prompts/emotion_rules.md
  - prompts/livestream_rules.md
  - prompts/copyright_boundary.md
knowledge_files:                       # 可选，合计 ≤ 8 KB
  - knowledge/rhodes_island_overview.md
default_emotion: neutral
default_motion: idle
allowed_emotions: [neutral, smile, serious, worried, sad, surprised, thinking, confident]
allowed_motions: [idle, greeting, nod, shake, think, encourage, battle_ready]
```

`characters/README.md` 写字段表（字段 | 必填 | 类型 | 说明 | 校验规则）。README §8 示例里的 `avatar` 暂不使用（没有对应目录），不写入。验证：B-04 loader 在真实角色包上通过（3 号执行）。

### A2-03 Prompt（2 号，6 h，依赖 A2-01，H-05 10-19）

| 文件 | 要点 |
| --- | --- |
| `persona.md` | 原创干员：背景、职责、性格三条；称呼用户“博士”；不自称任何官方角色，不使用官方角色名 |
| `speech_style.md` | 中文口语；单条回复 ≤ 120 字、1~3 句（WA-09）；不用 emoji、Markdown、列表（会被 TTS 念出来） |
| `emotion_rules.md` | 只输出一行 JSON `{"text":"…","emotion":"…","motion":"…"}`，不加解释、不加代码块；只用冻结枚举；拿不准时 `neutral` / `idle`；附 3 组示例 |
| `livestream_rules.md` | 不讨论政治、色情、暴力细节；拒绝索取个人信息；遇到越界请求礼貌转移话题，仍按 JSON 输出 |
| `copyright_boundary.md` | 不复述官方剧情原文、台词、角色设定细节；被要求时说明这是同人项目并概括说明 |

`prompts/tests/dialogue_cases.md`：10 条用例（问候、疲惫、夸奖、问天气、问游戏剧情、要求扮演官方角色、索取个人信息、超长提问、英文提问、要求用 Markdown 回复）。O-01 到位后与 3 号实测，记录每轮 JSON 是否合法、枚举是否合法、字数。完成标准：至少 9/10 轮 JSON 和枚举都合法，失败轮次写明原因并改 Prompt。O-01 未到位前用 mock LLM 只检查 Prompt 拼接格式。

### A2-04 `model_dict.json` 开发版（2 号 3 h + 1 号 1 h，依赖 A2-01、D6，H-06 10-19）

- 开发模型：Live2D 官方免费样例中选一个（具体模型名与《免费素材许可》适用范围由 2 号在 A2-05 核对，未验证）。各人本机放到 `local-models/dev_model/`，键名固定为 `arknights_fan_model`，这样换正式模型时只改 `modelPath` 和映射。
- `character_pack/live2d-models/model_dict.json`：

```json
{
  "arknights_fan_model": {
    "modelPath": "characters/dev_model/dev_model.model3.json",
    "scale": 1.0,
    "initialPosition": { "anchor": "bottom-right", "offsetX": -28, "offsetY": -28 },
    "defaultExpression": "<样例模型的默认表情名>",
    "emotionMap": { "neutral": "<名>", "smile": "<名>", "worried": "<名>" },
    "motionMap": { "idle": { "group": "Idle", "index": 0 }, "greeting": { "group": "TapBody", "index": 0 } },
    "tapMotions": ["greeting", "nod"]
  }
}
```

- `<名>` 和 group 名按样例模型的 `model3.json` 实际内容填写；8 个 emotion、7 个 motion 都要有条目。样例资源不够时允许多个值映射到同一个资源，并在 `live2d-models/README.md` 的对照表中标“近似”。
- 验证：1 号用 A1-08 调试面板逐项触发；`validateEntry` 无缺失警告。

### H-07 `voices.yaml`（2 号，1 h，10-19）

格式采用 4 号在 C 计划 §4.2 的提案（`version`、`default_voice_id`、`voices.<id>.provider_voices`、`rate`、`pitch`、`emotion` 微调），2 号确认后定稿（WA-09）。`voice_id` 与角色 YAML 一致。音色名先写 `zh-CN-XiaoyiNeural`，以 4 号 `edge-tts --list-voices` 的实际输出为准。只用 provider 的通用音色，不模仿官方配音演员（VOICE_POLICY）。验证：4 号的 tts_gateway 以此文件启动，每个 `voice_id` 合成 1 句。

### A2-05 素材来源登记（2 号，3 h，依赖无，W0 开始）

`character_pack/ASSET_SOURCE_TABLE.md` 表头：

| ID | 类型 | 名称 | 作者/权利方 | 来源链接 | 许可与关键条款 | 用途 | 进仓库 | 进安装包 | 状态 | 核对人/日期 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

首批登记：Live2D Cubism Core（Live2D Proprietary Software License；能否随安装包分发待核对）、开发样例模型（Free Material License；可用范围待核对）、Open-LLM-VTuber（MIT）、Live2D 渲染库（MIT，以实际选用包为准）、Edge TTS 音色（服务条款待核对）、CSS 占位角色（原创）。“状态”取值：`approved`、`dev_only`、`pending`、`rejected`。完成标准：每行都填齐，没有空格子；有一项 `pending` 就不能进安装包。

### A2-06 合规文档（2 号，3 h，依赖 D9）

- `docs/VOICE_POLICY.md`：只用通用合成音色，不克隆、不模仿官方配音；不提交任何官方音频；语音输入会发送到第三方云 ASR，不落盘（C-04）；TTS 缓存 72 h 自动清理；更换音色要先登记。
- `docs/LICENSE_NOTICE.md`：代码 MIT（D9 默认）；上游 Open-LLM-VTuber 的 MIT 版权声明原文；Live2D Core、Framework 和样例模型各自适用 Live2D 的许可，不属于 MIT；本项目为同人作品，与鹰角网络无关，“明日方舟”等商标归权利方所有；不包含官方素材。D9 结论不同时改第一条。

### A2-07 知识文件（2 号，3 h，依赖 A2-02）

`character_pack/knowledge/`：`rhodes_island_overview.md`（自行概述公开常识，≤ 1500 字）、`glossary.md`（术语 ≤ 30 条，每条 ≤ 50 字）。全部用自己的话写，不复制官方剧情、台词、档案原文；每个文件开头注明“同人概述，非官方资料”。合计 ≤ 8 KB（WA-09）。验证：1 号抽查 5 条；B-04 加载后 system prompt 长度在上限内。

## 5. 测试计划

### 5.1 单元测试（vitest，`client/tests/`）

| 文件 | 要点 |
| --- | --- |
| `enums.test.ts` | 8/7 个合法值原样返回；未知值、空串、`null`、数字、`"Smile"` 回退；数组冻结 |
| `stateMachine.test.ts`（改） | 新枚举；`requestFailed` → `worried`/`idle`；无音频回复定时回 idle |
| `parseChatResponse.test.ts` | `text` 优先、`reply_text` 兼容；两者都缺抛错；id 不一致抛错；未知字段忽略；`error` 形状校验 |
| `chatClient.test.ts` | 令牌头有/无；非 2xx 错误体映射；超时（fake timers）；网络错误通知 `ConnectionMonitor` |
| `mockChatClient.test.ts`（改） | 覆盖 8 个 emotion、7 个 motion；含降级样例 |
| `contract.test.ts` | 读 fixtures：请求构造与 `chat_request.json` 深度相等；每个响应 fixture 经 `parseChatResponse` 不抛错；不引入 schema 校验库 |
| `session.test.ts`、`config.test.ts`（改） | UUID 生成与复用；新默认值；旧默认值迁移；自定义值保留 |
| `connectionMonitor.test.ts`、`healthClient.test.ts` | 退避序列 1/2/4/8/16/30；恢复后 online；`degraded` 判定 |
| `modelDict.test.ts`、`live2dMapping.test.ts` | 解析、相对路径；缺 emotion/motion 回退；`validateEntry` 报缺失 |
| `lipSync.test.ts` | RMS → level；平滑；静音判定 |
| `wavEncoder.test.ts` | RIFF 头字段；16 kHz/单声道/16 bit；样本裁剪到 [-1, 1]；长度 |
| `asrClient.test.ts` | multipart 字段；200、`ASR_EMPTY`、503、401、超时 |
| `pruneAssets.test.ts` | 临时目录中只保留占位角色；无 `ALLOW_CUBISM_CORE` 时删除 Core |

fixtures：H-04 前放 `client/tests/fixtures/`，H-04 后改读 `server/common/fixtures/`（3 号维护），本地副本删除。重采样依赖浏览器 API，只做手工测试。

### 5.2 手工测试（证据存 `audit/evidence/thread_a1/`、`thread_a2/`）

| ID | 场景 | 证据 |
| --- | --- | --- |
| M-01 | 窗口透明、置顶、拖动、托盘、Alt+F4、第二实例 | 截图 6 张 |
| M-02 | 8 个表情、7 个动作 | 录屏 15 段 |
| M-03 | 口型有声/静音 | 录屏 1 段 |
| M-04 | 停 TTS：只显示字幕、无错误 | 截图 |
| M-05 | 录音识别；停 ASR 切文本 | 截图 + 时间戳 |
| M-06 | 停后端 → 断线 → 重启 → 自动恢复 | 时间戳记录 |
| M-07 | 干净 Windows 安装、对话、卸载 | 截图 + 安装包内容清单 |
| M-08 | Prompt 10 轮实测 | `dialogue_cases.md` 结果表 |

## 6. 对外交付与 Mock

| ID | 内容 | 提供 | 截止 | 验收方式 |
| --- | --- | --- | --- | --- |
| H-01 | `ENUM_PROPOSAL.md` | 2 号 | 10-12 | 1、3 号在 PR 中确认 |
| H-05 | 角色 YAML + 5 个 Prompt | 2 号 | 10-19 | B-04 loader 在真实角色包上测试通过 |
| H-06 | 开发模型说明 + `model_dict.json` | 2 号 | 10-19 | A1-07 加载成功，`validateEntry` 无缺失 |
| H-07 | `voices.yaml` | 2 号 | 10-19 | tts_gateway 以此启动，每个 `voice_id` 合成 1 句 |
| — | 客户端 Mock 模式 | 1 号 | W2 | `VITE_MOCK_CHAT=true VITE_MOCK_ASR=true npm run dev` 可完整演示 |
| — | 客户端生成的 WAV 样例 | 1 号 | W4 | 4 号的 asr_gateway 校验通过 |

本线程接收：H-04（10-15）、H-10（10-20）、H-11（10-23）、B-09 + C-09 的 https 地址（S4）。到期未到时按 §2 继续用 Mock，并在周报中标为阻塞。

## 7. 周计划（单位 h；目标每人每周约 10 h）

| 周 | 1 号（A1） | h | 2 号（A2） | h |
| --- | --- | --- | --- | --- |
| W0（假期，可选） | A1-01 修法在临时副本验证 | 2 | A2-01 草稿；A2-05 开始 | 2.5 |
| W1 | G-02 3、G-03 1、A1-01 提交 0.5、G-08 2、A1-02 0.5、A1-03 2 | 9 | A2-01 定稿 1；A2-05 1.5；A1-02 截图 1；A2-02 起草 2；A2-03 起草 2 | 7.5 |
| W2 | A1-04 4、A1-05 2、A1-06 3（单测）、A1-07 试验 1.5 | 10.5 | A2-02 1；A2-03 4；A2-04 3；H-07 1 | 9 |
| W3 | D2 修订 2、A1-07 4.5、A1-08 3（含 A2-04 联调 1） | 9.5 | A2-06 3；A2-07 3 | 6 |
| W4（S3） | A1-08 2、A1-09 3、A1-10 4、S3 集成 4 | **13** ⚠ | S3 集成 3；`DESKTOP_PET_MODE.md` 用户部分 2；Prompt 10 轮实测（主导，与 3 号）2；M-02 录屏 2 | 9 |
| W5（S4） | A1-10 联调 1、A1-11 4、S4 联调 4 | 9 | A1-11 干净机器验证 2；合规文档定稿 2；C-10 非作者部署验证 2 | 6 |
| W6（S5） | 取证与审计 3、集成遗留 2 | 5 | 取证 3；审计 2 | 5 |
| 合计 | | 58 | | 45 |

W4 超 3 h，按序削减：① A1-08 的 `tapMotions` 移到 S5 之后（−1 h）；② A1-09 的 `AnalyserNode` 推迟，保留随机口型（−3 h，AC-06 口型以“随机口型”取证并标 `partial`）。2 号表中已包含两项跨线程支援（Prompt 实测主导、C-10 非作者验证），另外 W3、W5、W6 仍有约 13 h 余量（见总览 §7）。C-10 验证需要拥有者给 2 号开通一台 VM 的登录权限（O-03）。

## 8. 风险与回退

| 风险 | 影响 | 回退 |
| --- | --- | --- |
| Live2D 库与 Electron 34 / Vite 6 / pixi 版本不兼容 | AC-03/07/08 | W2 试验；改用社区分支；再不行评估官方 SDK（+15 h），AC 顺延 |
| Cubism Core 不能随安装包分发 | AC-01/16 | 安装包不含 Core；文档说明用户自行放置。加载路径方案在 A1-11 验证（需验证） |
| 样例模型表情、动作不足 8/7 个 | AC-07/08 | 近似映射，对照表标“近似” |
| 跨域音频导致 `AnalyserNode` 无数据 | AC-06 口型 | 随机口型回退；B 侧加 CORS（WA-08） |
| 麦克风权限或安全上下文异常 | AC-05 | 文本输入；AC-05 标 `partial`，记录原因 |
| LLM 不按 JSON 输出 | AC-04/07/08 | B 侧解析兜底；改 Prompt；验收线 9/10 |
| G-02 迁移冲突或丢文件 | 全部 | 单个 PR 一次完成；迁移前冻结嵌套目录；manifest 校验 |
| 安装包无签名 | AC-16 | 文档说明 SmartScreen 处理 |
| 1 号 W4 超时 | 进度 | §7 削减顺序；2 号承接取证 |

## 9. 审计输出

- 文件：`audit/thread_a1_audit.{md,json}`（1 号）、`audit/thread_a2_audit.{md,json}`（2 号），格式沿用工作报告 v2，两份结论必须一致。
- JSON 字段：`report_format`、`thread`（`a1`/`a2`）、`owner`、`date`、`branch`、`commit`、`status`、`tasks[]{id,status,evidence[],notes}`、`acceptance[]{id,status,evidence[]}`、`verification[]{command,cwd,exit_code,summary}`、`not_run[]{item,reason}`、`risks[]`、`open_items[]`、`sensitive_scan{command,hits}`。状态枚举与工作报告相同。
- 证据规则：截图（PNG，≤ 500 KB）进 `audit/evidence/thread_a*/`；录屏含样例模型，不进仓库，存团队网盘，审计里记文件名、sha256、时长和存放位置；命令输出附退出码和摘要。
- A2 额外检查：`ASSET_SOURCE_TABLE.md` 无空格子；`dialogue_cases.md` 结果表；`git ls-files | grep -Ei '\.moc3$|\.motion3\.json$|\.exp3\.json$|live2dcubismcore'` 期望无输出。
- 敏感信息：`git grep -nIE '(api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}' -- ':!*.example' ':!*.md'` 期望无命中；有命中逐条人工复核。

## 10. 对公共假设的修订建议

| # | 建议 | 处理 |
| --- | --- | --- |
| 1 | `/api/audio/*` 返回 CORS 头，供 `AnalyserNode` 使用 | 已采纳（WA-08） |
| 2 | 服务端对 LLM 输出的枚举先规范化，客户端严格校验 | 已采纳（WA-09） |
| 3 | 客户端 chat 超时 30 s，与服务端预算对齐 | 已采纳（WA-12） |
| 4 | `ASR_UNAVAILABLE` 统一为 HTTP 503 | 已采纳（WA-05、WA-06） |
| 5 | YAML 和 `model_dict.json` 的路径一律相对路径 | 已采纳（WA-09） |
| 6 | 角色 YAML 增加 `knowledge_files` | 已采纳（WA-09） |
| 7 | 新增 `VITE_MOCK_ASR` | 已采纳（WA-10） |
| 8 | CI 文件名 `client.yml` | 已采纳（WA-11） |
| 9 | 录屏证据不进仓库，审计记录 sha256 | 建议三线程统一（总览 §6） |
| 10 | Electron 打包后实际发送的 Origin | 未决：A1-04 联调时实测，结果回填 WA-08 |
