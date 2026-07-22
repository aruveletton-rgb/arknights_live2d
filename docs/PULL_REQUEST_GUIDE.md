# 零基础 Pull Request 提问指南

Pull Request（PR）可以理解为一张“请仓库拥有者查看并作出书面决定”的申请单。PR 不会立刻修改正式说明；只有合并后，内容才进入 `main`。

本指南只使用 GitHub 网页，不要求安装 Git。

## 1. 准备问题

准备以下内容：

- 你正在阅读或处理什么。
- 你不确定的一个主要问题。
- 你已经查看或尝试过什么；没有时可写“无”。
- 你希望仓库拥有者决定什么。

不要填写密码、令牌、服务器凭据或个人隐私。

## 2. 网页操作步骤

1. 打开[问题登记页](../questions/QUESTIONS.md)。
2. 点击文件右上角的铅笔图标。
3. 如果 GitHub 显示 **Fork this repository**，点击它创建个人副本。
4. 在“待回答的问题”下面复制模板并填写。如果是第一个问题，只删除“当前没有待回答问题”这一句。
5. 点击 **Preview** 检查内容，不要删除别人的问题。
6. 点击 **Commit changes...**。
7. 选择创建新分支；分支名可使用 `question/简短问题名`。
8. 点击 **Propose changes** 或 **Commit changes**。
9. 核对 PR 方向：
   - base repository：`aruveletton-rgb/arknights_live2d`
   - base：`main`
   - head repository：你的个人副本
   - compare：你刚创建的问题分支
10. 标题填写 `[提问] 一句话问题`，按模板补全背景。
11. 点击 **Create pull request**。

正确方向：

```text
正式仓库 main ← 你的问题分支
```

## 3. 创建 PR 后

- 在同一个 PR 的评论区回答仓库拥有者的追问。
- 如果需要修正文字，继续编辑同一个分支，PR 会自动更新。
- 如果问题形成长期规则，应更新对应说明文档。
- 不要为同一个问题重复创建多个 PR。

## 4. 提交文档修正

发现错字、职责错误或失效链接时，也可以按相同步骤提交 `docs/简短说明名` 分支。PR 中写清原文、建议修改和理由。

本仓库不接受项目实现代码；代码问题可以在这里提问，但实际修改应在对应实现仓库进行。

## 5. GitHub 官方说明

- [直接在 GitHub 网页编辑文件](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files)
- [从 Fork 创建 Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)
