# 当前有效内容复核审计

- 审计日期：2026-10-08
- 仓库：`git@github.com:aruveletton-rgb/arknights_live2d.git`
- 分支：`main`
- 远程同步前状态：本地相对 `origin/main` 已有 3 个提交，工作区另有本次项目实现、部署配置、计划和审计文件改动。
- 审计目的：在 Git 提交和推送前确认有效内容可解析、可构建、可测试、可部署配置，并排除浏览器临时产物。

## 1. 纳入范围

纳入当前项目同步的内容包括：

- `README.md`、`docs/`：项目说明、API 合同、执行计划、服务器和 Live2D 说明。
- `server/`、`deploy/`、`scripts/`：Mock LLM/TTS/ASR、orchestrator、两 VM Compose、健康检查和部署校验脚本。
- `character_pack/`：角色元数据、占位模型字典和素材来源说明。
- `upstream/Open-LLM-VTuber/client/`：Electron/Vite 客户端、占位 Live2D 资源、Mock 对话、ASR 客户端和测试。
- `audit/`：既有阶段审计、当前 Live2D 人工审计及本报告；本次生成的审计 ZIP 作为项目审计附件纳入。

明确排除：`.playwright-cli/`。该目录只包含本次浏览器检查生成的临时快照和日志，不是项目源代码或交付证据。

## 2. 有效性检查

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 客户端构建 | `pass` | `npm run selfcheck` 中 `tsc`、Vite build 成功。 |
| 客户端测试 | `pass` | 5 个测试文件、13 个测试通过。 |
| 两 VM Compose 配置 | `pass` | `docker compose -f deploy/vm1-gateway/compose.yaml config -q` 和 VM-2 对应命令通过。 |
| 开发环境配置校验 | `pass` | `python scripts/validate_deployment.py --allow-example` 通过且未输出密钥。 |
| 审计 JSON | `pass` | `audit/` 下 7 个 JSON 文件均成功解析。 |
| 空白错误 | `pass` | `git diff --check` 无错误输出。 |
| 敏感信息 | `pass` | 未发现私钥、实际令牌、密码或公网地址；命中的 `API_TOKEN` 和 `VM*_DOMAIN` 均为示例配置/文档字段。 |
| 远程分支 | `ready` | `git fetch origin --prune` 成功；未发现远程领先或分叉，待提交内容完成后推送 `main`。 |

## 3. 项目边界

- Live2D 当前仍是项目自有占位资源；正式 Cubism 模型和授权素材保持后续阶段。
- TTS/ASR 当前使用 Mock；真实供应商凭据和音色未写入仓库。
- 两 VM 设计保持不变：VM-1 承担 HTTPS/orchestrator/备用 TTS，VM-2 承担主 TTS/ASR/健康检查。
- 本次检查验证的是本地构建、配置和审计证据，不等同于远程 VM 已部署或公网生产验收。

## 4. 审计附件

本报告与以下文件一同封装到 `audit/live2d_content_audit_bundle_2026-10-08.zip`：

- `current_content_audit.md`、`current_content_audit.json`
- `live2d_manual_audit.md`、`live2d_manual_audit.json`
- `final_integration_audit.md`、`final_integration_audit.json`
- `phase2_live2d_audit.md`、`phase2_live2d_audit.json`
- `phase3_hardening_audit.md`、`phase3_hardening_audit.json`

压缩包不包含密钥、服务器真实地址、浏览器临时目录或构建缓存。
