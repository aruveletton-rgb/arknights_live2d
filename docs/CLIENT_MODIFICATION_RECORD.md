# 客户端修改记录

## 本次整理动作

- 原始源码未做逻辑修改。
- 将原 `client/` 整体移动到统一仓库路径 `upstream/Open-LLM-VTuber/client/`。
- 复制占位模型说明到 `character_pack/live2d-models/placeholder_operator/`。
- 新增运行、Live2D、排错、接口差异、仓库映射和集成缺口文档。
- 新增 A1 审计 JSON 和源文件 SHA-256 清单。

## 对上游的影响

本次没有对真实 Open-LLM-VTuber 上游代码进行修改，因为原压缩包不包含上游仓库。后续合并时应先确认该客户端是作为上游子目录、独立包还是补丁集存在。

## 可回滚性

所有原文件内容均保留且可通过 `audit/source_manifest.json` 校验。删除新增文档并将 `upstream/Open-LLM-VTuber/client/` 移回 `client/` 即可还原原始包结构。

## 上游升级风险

当前风险较低，因为代码仍保持独立目录。但若直接合并到上游现有 Electron 客户端，需要逐文件比对入口、构建系统和 API 协议，不能直接覆盖。
