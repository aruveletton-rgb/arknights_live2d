# 仓库整理映射

## 原始内容

原压缩包只有一个 `client/` 根目录，包含 Electron 主进程、React 渲染层、Live2D 占位接入层、测试和客户端 README。

## 映射规则

| 原路径 | 整理后路径 | 处理方式 |
|---|---|---|
| `client/**` | `upstream/Open-LLM-VTuber/client/**` | 原样迁移，不修改源码 |
| `client/public/characters/placeholder_operator/README.md` | `character_pack/live2d-models/placeholder_operator/README.md` | 复制一份作为角色资产入口说明 |
| 无 | `docs/**` | 按计划书补充 A1 文档 |
| 无 | `audit/thread_a1_desktop_audit.json` | 按统一审计格式新增 |
| 无 | `server/`、`deploy/`、其他 `character_pack/` 子目录 | 仅建立边界说明，不伪造其他线程实现 |

## 未删除内容

原压缩包中的所有源码、测试、配置和 README 均保留。没有删除任何原始文件。

## 为什么放在 upstream/Open-LLM-VTuber/client

计划书要求人员 1 的主要工作目录位于 `upstream/Open-LLM-VTuber/`。由于本次提交不是完整上游仓库，而是独立客户端，因此采用嵌套 `client/` 的方式保留原始边界，避免误认为这些文件就是上游仓库根目录。
