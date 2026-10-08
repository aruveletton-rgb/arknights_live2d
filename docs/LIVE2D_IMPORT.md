# Live2D 模型接入说明

## 1. 统一素材目录

正式 Live2D 模型应登记在：

```text
character_pack/live2d-models/<model_name>/
```

当前客户端运行时从其 `public/characters/` 静态目录读取模型。集成阶段需通过复制脚本、构建步骤或符号链接，将获授权的模型同步到：

```text
upstream/Open-LLM-VTuber/client/public/characters/<model_name>/
```

本整理包仅包含占位说明，不包含任何官方游戏资源或未授权 Live2D 素材。

## 2. 当前模型加载方式

设置面板中的“角色模型路径”应填写类似：

```text
/characters/<model_name>/<model>.model3.json
```

`Live2DRenderer.ts` 会读取该 JSON，确认其 `type` 为项目占位模型类型，并加载同目录的 `model_dict.json`。渲染层当前仍使用 CSS 占位角色；尚未集成 Cubism SDK、PixiJS 或其他真正的 Live2D 渲染器。

## 3. model_dict.json 建议格式

`character_pack/live2d-models/model_dict.example.json` 提供了计划书要求的配置示例，包含模型路径、缩放、初始位置、默认表情、`emotionMap` 和 `tapMotions`。

第二阶段已冻结并实现以下字段：`modelPath`、`scale`、`initialPosition`、`defaultExpression`、`emotionMap`、`motionMap`、`tapMotions` 和可选的 `placeholder`。客户端会拒绝无效路径、缩放、锚点、映射或动作值，并在字典不可用时继续使用合同默认值。

## 4. 表情回退

表情不存在时回退 `neutral`。状态机和渲染器都执行合同白名单检查；角色包可以通过 `emotionMap` 将合同情绪映射到模型实际表情。

## 5. 动作回退

动作不存在时回退 `idle`。当前客户端仍未接入真实动作播放器，但 `data-motion` 已使用 `motionMap` 和合同回退值，后续接入 Cubism 时可直接消费该值。

## 6. 建议接入顺序

1. 以 `placeholder_operator` 作为当前可运行基线，保持模型字典和角色 YAML 同步。
2. 在用户确认授权、来源和许可后，再引入正式 Live2D 渲染库和模型。
3. 根据 `emotionMap` 映射表情名称，根据 `motionMap` 调用模型动作组。
4. 为未知表情回退 `neutral`，未知动作回退 `idle`。
5. 将音频振幅接入口型参数，并增加模型缺失、纹理缺失和动作缺失测试。

## 6. 第二阶段边界

- 当前交付包含角色包元数据、占位 `model3.json`、模型字典校验、表情/动作映射和基础回退。
- 当前交付不包含正式 Live2D 模型、官方游戏素材、Cubism Core、未授权音色或密钥。
- 正式模型是否进入安装包、其授权来源、许可文本和资源体积必须由用户单独审计确认后再写入执行计划。
