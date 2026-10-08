# Character Pack 指南（目录占位版）

当前版本包含一个仅用于开发验证的角色包元数据：`characters/arknights_fan_001.yaml` 和 `live2d-models/placeholder_operator/model_dict.json`。统一目录已经建立：`characters/`、`prompts/`、`live2d-models/`、`voices/`、`backgrounds/`、`knowledge/`。

客户端当前消费角色 ID、模型路径和 `model_dict.json`。角色 YAML 使用 `voice_policy: mock_only` 和 `asset_status: dev_only`，与 `docs/API_CONTRACT.md` 的 emotion/motion 枚举保持一致。素材来源和许可状态登记在 `character_pack/ASSET_SOURCE_TABLE.md`。

正式模型接入前必须补充授权来源、许可文本、资源清单和安装包纳入范围；未完成用户审计前不得替换占位模型或提交官方素材。
