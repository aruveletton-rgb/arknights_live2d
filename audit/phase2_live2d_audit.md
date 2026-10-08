# 第二阶段角色包与 Live2D 占位增强审计

- 审计日期：2026-10-08
- 执行窗口：2026-10-08 至 2026-10-09
- 分支：`main`
- 基线提交：`97f6d06237614dc43ee19a7848b3f20d5ba35cfb`
- 阶段状态：`pass`（占位增强范围）；正式 Live2D、Cubism Core 和安装包纳入保持 `deferred`

## 1. 审计范围

本阶段按用户已确认的主线执行：角色包元数据、占位 `model3.json`、`model_dict.json` 合同校验、情绪/动作映射和基础降级。沿用两台 VM 的第一阶段职责和 Mock LLM/TTS/ASR，不新增服务器，不修改 VNet、NSG、DNS、公网证书或系统防火墙。

当前不包含正式 Live2D 模型、官方游戏素材、Cubism Core、未授权音色、真实供应商或 Windows 安装包。正式资源只有在用户确认授权、许可、再分发范围、安装包纳入范围和资源预算后才可进入下一阶段。

## 2. 验收矩阵

| 编号 | 状态 | 证据与说明 |
| --- | --- | --- |
| PH2-01 模型字典合同 | `pass` | `modelDict.ts` 校验路径、正缩放、锚点、默认表情、映射、动作白名单和可选占位标记。 |
| PH2-02 表情/动作回退 | `pass` | 未知表情回退 `neutral`，未知动作回退 `idle`；状态机的说话和错误状态只产生合同内值。 |
| PH2-03 角色包元数据 | `pass` | `character_pack/characters/arknights_fan_001.yaml`、`character_pack/live2d-models/placeholder_operator/model_dict.json` 和来源表已存在。 |
| PH2-04 客户端占位加载 | `pass` | Vite 实际返回占位模型 JSON 和字典 HTTP 200；页面数据集状态为 `idle`、`neutral`、`idle`。 |
| PH2-05 构建和单元测试 | `pass` | `npm run selfcheck` 成功，构建完成，5 个测试文件共 13 个测试通过。 |
| PH2-06 构建产物资源 | `pass` | `dist/renderer/characters/placeholder_operator/placeholder.model3.json` 和 `model_dict.json` 均存在。 |
| PH2-07 正式模型与授权 | `deferred` | 用户尚未确认正式模型授权、许可和安装包范围；本阶段不执行。 |

## 3. 验证命令和结果

| 命令/步骤 | 结果 | 证据 |
| --- | --- | --- |
| `npm run selfcheck`（`upstream/Open-LLM-VTuber/client`） | `pass` | TypeScript、Vite build 和 Vitest 均成功；13/13 tests passed。 |
| JSON 解析占位模型、客户端字典和角色包字典 | `pass` | Node JSON parse 输出 `JSON valid`。 |
| `git diff --check` | `pass` | 无空白错误输出。 |
| Vite `http://127.0.0.1:5173/` | `pass` | 页面标题为 `Arknights VTuber Pet`；占位模型和字典请求均 HTTP 200。 |
| 浏览器 DOM 检查 | `pass` | `data-model-path=/characters/placeholder_operator/placeholder.model3.json`，`data-motion=idle`，`data-expression=neutral`。 |
| 浏览器控制台 | `partial` | 仅发现未提供 `favicon.ico` 的 404；不影响模型或字典加载。 |

## 4. 资源和部署边界

- 第一阶段两台 VM 继续运行 Mock 服务；本阶段没有服务器代码或容器变更，因此没有新增远程部署动作。
- 客户端构建产物已生成到 `upstream/Open-LLM-VTuber/client/dist/renderer/`，占位 JSON 会随静态资源复制。
- 占位 JSON/CSS 的成功不能推断正式模型的 GPU、内存、安装包容量或授权可分发性。

## 5. 未决项和后续门槛

1. 用户确认正式 Live2D 模型的来源、授权和许可文本。
2. 用户确认是否允许将模型、Cubism Core 和相关库放入 Windows 安装包。
3. 对正式模型测量资源体积、加载时间和目标设备内存；不能沿用 Mock 占位资源的结论。
4. 真实模型确认后再实现 Cubism 渲染、动作组调用、纹理缺失提示和真实音频口型。

## 6. 敏感信息审计

本阶段新增文件未写入服务器 IP、订阅 ID、令牌、密钥、Cookie、官方素材或未授权音色。工作区仍包含第一阶段未提交改动；本审计不提交、不推送，也不重写用户已有历史。
