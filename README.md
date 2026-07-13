# 明日方舟风格 Live2D 桌宠项目说明与提问窗口

本仓库只用于集中阅读项目说明、查看人员职责、记录已确认决定，以及通过 Pull Request 向仓库拥有者提问。

> 本仓库不是项目代码仓库，不按照客户端、后端、角色包或服务器部署目录组织。

> 当前内容是项目计划说明。客户端、Live2D、后端、语音服务和服务器部署均未在本仓库实现或验证。

## 本仓库包含什么

- 项目目标、系统流程和阶段计划。
- 四人三线程的职责说明。
- 合规和敏感信息边界。
- 面向非技术参与者的协作与提问方法。
- 待回答问题及已经形成的书面决定。

## 本仓库不包含什么

- 客户端或后端源代码。
- Live2D 模型、图片、声音、背景或字体素材。
- Docker、服务器部署脚本、真实 `.env` 或密钥。
- 构建产物、安装包、运行日志或测试结果文件。
- `Open-LLM-VTuber` 的源码副本或子模块。

这些内容应放在未来单独建立的实现仓库中。本仓库只记录其说明和链接。

## 第一次阅读

| 你想了解什么 | 阅读位置 |
| --- | --- |
| 全部说明文档入口 | [文档目录](docs/README.md) |
| 项目要做什么 | [项目概览](docs/PROJECT_OVERVIEW.md) |
| 1、2、3、4 号分别负责什么 | [人员职责](docs/TEAM_RESPONSIBILITIES.md) |
| 项目计划怎样推进 | [阶段计划](docs/PROJECT_ROADMAP.md) |
| 用户输入如何变成桌宠回复 | [系统流程](docs/SYSTEM_FLOW.md) |
| 怎样提交说明或向负责人提问 | [协作规则](docs/COLLABORATION_WORKFLOW.md) |
| 不懂 Git，怎样发起 Pull Request | [PR 提问指南](docs/PULL_REQUEST_GUIDE.md) |
| 哪些素材和信息不能上传 | [合规边界](docs/COMPLIANCE.md) |
| 为什么采用当前解释 | [资料来源与决定](docs/SOURCES_AND_DECISIONS.md) |

## 人员总览

项目计划采用四人、三条线程：

| 线程 | 人员 | 计划职责 |
| --- | --- | --- |
| A1 | 1 号 | 桌宠客户端与 Live2D 接入 |
| A2 | 2 号 | 角色包、Prompt、表现规则与素材合规 |
| B | 3 号 | 后端编排、WebSocket/API、LLM 与会话 |
| C | 4 号 | TTS/ASR、服务器部署、健康检查与备份 |

1 号和 2 号人员计划书只用于再次确认线程 A 内两人的分工，不会替代线程 B、线程 C 或其负责人。

## 向仓库拥有者提问

本项目把 Pull Request（PR）当作一张“请负责人查看并作出书面决定”的申请单。

最简单的方式：打开[问题登记页](questions/QUESTIONS.md)，点击铅笔图标，在个人副本中添加问题，然后创建指向正式仓库 `main` 的 PR。详细按钮步骤见[PR 提问指南](docs/PULL_REQUEST_GUIDE.md)。

推荐标题：

```text
[提问] 我不确定角色模型的授权由谁确认
```

## 编码规则

本仓库所有文本文件统一使用无 BOM 的 UTF-8 编码和 LF 换行。仓库根目录的 `.editorconfig` 与 `.gitattributes` 用于统一编辑器和 Git 行为。

## 项目地址

- GitHub：<https://github.com/aruveletton-rgb/arknights_live2d>
- 仓库拥有者：[`@aruveletton-rgb`](https://github.com/aruveletton-rgb)
