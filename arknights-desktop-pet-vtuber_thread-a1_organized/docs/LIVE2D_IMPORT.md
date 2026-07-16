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

`Live2DRenderer.ts` 当前只检查该 URL 是否可访问，并使用 CSS 占位角色展示状态；它尚未集成 Cubism SDK、PixiJS 或其他真正的 Live2D 渲染器。

## 3. model_dict.json 建议格式

`character_pack/live2d-models/model_dict.example.json` 提供了计划书要求的配置示例，包含模型路径、缩放、初始位置、默认表情、`emotionMap` 和 `tapMotions`。

该文件目前是接口约定示例，客户端尚未读取它。正式集成前应由人员 1 与人员 2 冻结字段，并在客户端实现加载器。

## 4. 表情回退

计划书要求：表情不存在时回退 `neutral`。当前客户端直接把后端情绪写入 `data-expression`，没有运行时白名单检查或回退逻辑。

## 5. 动作回退

计划书要求：动作不存在时只播放 `idle`。当前客户端没有真正动作播放器，也没有未知动作回退逻辑。

## 6. 建议接入顺序

1. 冻结角色 YAML 与 `model_dict.json` 字段。
2. 引入授权的 Live2D 渲染库。
3. 根据 `emotionMap` 映射表情名称。
4. 根据动作名称调用 Cubism motion group。
5. 为未知表情回退 `neutral`，未知动作回退 `idle`。
6. 将音频振幅接入口型参数。
7. 增加模型缺失、纹理缺失和动作缺失测试。
