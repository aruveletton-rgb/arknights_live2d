# 工作报告：项目仓库协作设置

- 日期：2026-07-13
- 负责人：owner
- 状态：pass
- Pull Request：<https://github.com/aruveletton-rgb/arknights_live2d/pull/1>

## 目标

把四份原始计划材料整理为非技术参与者可阅读的项目基线、四人三线程职责、阶段流程、PR 提问方法和协作模板，并推送到 GitHub 供仓库拥有者审阅。根据仓库拥有者后续澄清，1 号和 2 号计划只细化线程 A，不替代 3 号、4 号职责；本报告与文档已同步修正。

## 文件变化

- 修改：`README.md`
- 新增：`.github/CODEOWNERS`、`.github/PULL_REQUEST_TEMPLATE.md`
- 新增：`docs/API_CONTRACT.md`、`docs/COLLABORATION_WORKFLOW.md`、`docs/COMPLIANCE.md`、`docs/PROJECT_BASELINE.md`、`docs/PROJECT_PLAN.md`、`docs/PULL_REQUEST_GUIDE.md`、`docs/SOURCES_AND_DECISIONS.md`、`docs/TEAM_RESPONSIBILITIES.md`
- 新增：`questions/QUESTIONS.md`、`character_pack/ASSET_SOURCE_TABLE.md`
- 新增：`audit/README.md` 和 `audit/templates/` 下两份模板
- 删除：无

## 验证

| 检查 | 实际操作或命令 | 结果 |
| --- | --- | --- |
| 原始材料读取 | 渲染并抽查两份 PDF 页面，同时提取全文；以 UTF-8 读取两份 TXT | pass，四份材料均可读取 |
| 人员方案一致性 | 检查 A1/1 号、A2/2 号、B/3 号、C/4 号必需表述，并扫描错误的当前两人方案残留 | pass，四人三线程映射一致 |
| Markdown 链接 | 逐个解析仓库内相对链接并确认目标存在 | pass，未发现缺失目标 |
| JSON 模板 | PowerShell `ConvertFrom-Json` | pass |
| GitHub 渲染 | GitHub Markdown API 渲染 README、人员职责和接口合同 | pass |
| Git 差异格式 | `git diff --cached --check` | pass |
| 敏感格式扫描 | 检查常见 GitHub/OpenAI/AWS 凭据和私钥头部格式 | pass，未发现匹配 |

## 未运行的验证

- 未运行客户端、后端、Live2D、TTS、ASR 或服务器部署测试：本次改动不包含这些代码，仓库基线已将它们标记为未实现、未验证。

## 风险和未完成事项

- 风险：公共接口仍需 1、2、3、4 号在实现前共同确认。
- 风险：四服务器拓扑虽已按总计划恢复，但实际资源和可运行性仍需 4 号验证。
- 未完成：Pull Request #1 尚未合并，`main` 还没有这些文档。
- 未完成：项目许可证、正式素材授权和上游引入方式仍待确认。

## 下一步

- 仓库拥有者审阅并决定是否合并 Pull Request #1。
- 1、2、3、4 号确认各自职责以及 `API_CONTRACT.md` v0.1。
- 按 Phase 1 分别建立 A1、A2、B、C 最小演示任务。

## 公共约定与合规

- 是否修改公共接口：是，新增尚待四人确认的 `API_CONTRACT.md` v0.1 初稿。
- 是否包含敏感信息：否。
- 是否新增素材或声音：否，只新增空白来源登记表。
