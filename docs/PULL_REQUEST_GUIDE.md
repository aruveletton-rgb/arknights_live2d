# 零基础 Pull Request 提问指南

Pull Request（PR）可以理解为一张“请仓库拥有者查看”的申请单。创建 PR 不会立刻修改正式项目；只有仓库拥有者确认并合并后，内容才进入 `main`。

本指南优先使用 GitHub 网页，不要求安装 Git，也不要求输入命令。

## 1. 提问前准备

你只需要：

1. 一个已经登录的 GitHub 账号。
2. 一句清楚的问题。
3. 你已经查看或尝试过的内容。
4. 你希望负责人做出的决定。

不要在问题里填写密码、令牌、私钥、服务器地址中的凭据或个人隐私。

## 2. 在网页上提交问题

1. 打开项目的[问题登记页](../questions/QUESTIONS.md)。
2. 点击文件右上角的铅笔图标，即“编辑这个文件”。
3. 如果 GitHub 显示 **Fork this repository**，点击它。Fork 是你账号下的安全副本，不会直接修改原仓库。
4. 在“待回答的问题”标题下面复制问题模板，填写问题。如果页面仍写着“当前没有待回答问题”，请只删除这一句；不要删除别人的问题。
5. 点击上方的 **Preview**，检查文字是否完整。
6. 点击 **Commit changes...**。提交说明可写：`docs: 提问角色模型存放位置`。
7. 如果 GitHub 让你选择，选择“创建新分支并发起 Pull Request”，不要直接提交到 `main`。
8. 点击 **Propose changes** 或 **Commit changes**。GitHub 会进入创建 PR 的页面。
9. 核对方向：
   - **base repository**：`aruveletton-rgb/arknights_live2d`
   - **base**：`main`
   - **head repository**：你的 GitHub 副本
   - **compare**：你刚创建的分支
10. PR 标题写成：`[提问] 一句话问题`。
11. 按页面模板填写“背景、已尝试内容、希望负责人决定什么”。
12. 点击 **Create pull request**。

正确方向可以记成：

```text
正式仓库 main  ←  你的副本中的问题分支
```

## 3. 问题内容模板

```markdown
### [问题] 用一句话说明问题

- 提问人：你的名字或 GitHub 用户名
- 日期：YYYY-MM-DD
- 我正在做：说明当前任务
- 我不确定：只写一个主要问题
- 我已经查看或尝试：写“无”也可以，不要假装尝试过
- 我希望负责人决定：给出你需要的明确答案
- 是否阻塞当前工作：是 / 否
```

## 4. PR 创建之后

1. 仓库拥有者会在 PR 的 **Conversation** 页面回复。
2. 如果负责人需要更多信息，直接在同一页的评论框回答，不要另外开一个重复 PR。
3. 如果负责人要求改文字，可再次编辑你的问题分支；PR 会自动更新。
4. 得到答案后，负责人会把决定写入正式文档，然后合并或关闭 PR。

## 5. 提交工作成果

提交文档或代码时，步骤与提问相同，但还要：

- 从最新 `main` 开始建立工作分支。
- 按[协作流程](COLLABORATION_WORKFLOW.md)完成自查。
- 填写实际运行过的检查和结果。
- 工作类 PR 提交 Markdown 与 JSON 两份工作报告。

如果你不会操作，可以让 Codex 帮忙，但仍应自己阅读 PR 中的“修改内容”和“测试结果”。

## 6. 常见问题

### 找不到铅笔图标

先确认已经登录 GitHub，并且正在查看具体文件而不是文件夹。若页面提示需要 Fork，先按提示创建个人副本。

### 页面提示分支冲突

不要随便删除文件或强行覆盖。把冲突页面链接发给仓库拥有者，请其指导同步最新 `main`。

### PR 方向选反了

先不要提交。确保左侧是正式仓库的 `main`，右侧是你自己的问题或工作分支。

### 只想提问，为什么还要改文件

因为本项目希望问题、回答和最终决定都能留在仓库历史中，后来的参与者可以直接查到，不必重复询问。

## 7. GitHub 官方说明

- [直接在 GitHub 网页编辑文件](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files)
- [从 Fork 创建 Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)

GitHub 按钮文字可能随界面语言略有不同，但流程仍是“编辑个人副本 → 提交到新分支 → 创建 PR → 目标选择正式仓库的 `main`”。
