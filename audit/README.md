# 工作与审计记录

重要工作通过 Pull Request 提交时，应同时提供一份 Markdown 和一份 JSON 报告。两份报告必须表达相同的完成状态、测试结果、风险和未完成事项。

## 什么时候需要

- 代码、部署配置、公共接口或重要项目文档：需要。
- 纯提问 PR、拼写修正等极小修改：不需要。

## 文件位置和命名

```text
audit/reports/YYYY-MM-DD-person-1-short-task.md
audit/reports/YYYY-MM-DD-person-1-short-task.json
```

最终集成报告：

```text
audit/final_integration_audit.md
audit/final_integration_audit.json
```

## 状态含义

- `pass`：所有列出的验收项都实际通过。
- `partial`：完成了一部分，或有关键验证未运行。
- `fail`：核心目标未达到。

不要因为“代码已经写完”就填写 `pass`。如果没有运行测试，应填写 `partial` 并说明原因。

## 最少内容

1. 目标和负责人。
2. 修改、新增和删除的文件。
3. 实际运行的检查、命令和结果。
4. 没有运行的检查及原因。
5. 风险、未完成事项和下一步。
6. 是否修改公共接口、是否发现敏感信息或授权问题。

模板位于 [`audit/templates/`](templates/)。非技术参与者可以先填 Markdown，再让 Codex 按同样内容生成 JSON，并逐项核对两者是否一致。
