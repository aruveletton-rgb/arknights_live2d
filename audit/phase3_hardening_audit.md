# 第三阶段部署硬化与 Windows 开发包审计

- 审计日期：2026-10-08
- 分支：`main`
- 范围：两台 VM 配置审计、可回滚部署文档、客户端未签名开发安装包
- 状态：`partial`

## 已完成

| 编号 | 状态 | 证据 |
| --- | --- | --- |
| PH3-01 客户端开发安装包 | `pass` | `npm run package:dev` 成功生成 `upstream/Open-LLM-VTuber/client/release/Arknights VTuber Pet Setup 0.1.0.exe`。 |
| PH3-02 打包启动 | `pass` | `release/win-unpacked/Arknights VTuber Pet.exe` 启动检查成功，随后结束自有进程。 |
| PH3-03 Compose 配置 | `pass` | VM-1 和 VM-2 的 `docker compose config` 均退出码 0。 |
| PH3-04 开发环境门禁 | `pass` | 示例 `.env` 通过 `validate_deployment.py --allow-example`，无敏感值输出。 |
| PH3-05 Python 源码 | `pass` | 项目 10 个 Python 文件编译成功。 |

## 按设计未通过生产门禁的项目

| 编号 | 状态 | 说明 |
| --- | --- | --- |
| PH3-06 生产环境变量 | `not_run` | 当前没有真实令牌、域名和 VM-2 可达 URL；示例配置被脚本正确拒绝，退出码 1。 |
| PH3-07 Azure 网络和证书 | `deferred` | 用户确认保持两台 VM，但未授权修改 VNet/NSG、DNS、公网证书或系统防火墙；本阶段不执行远程变更。 |
| PH3-08 正式代码签名 | `deferred` | 没有签名证书；安装包状态为 `NotSigned`，仅用于开发验证。 |

## 安装包证据

- 文件：`Arknights VTuber Pet Setup 0.1.0.exe`
- SHA-256：`2B0023CD0E1754872927621CF1DA7F977E330C8230C38C5ED18D5002E33DEC1A`
- 产物大小：91,930,855 bytes
- 说明：使用本机 Electron 运行时和 `signAndEditExecutable=false`，没有写入正式模型或凭据。

## 复现命令

```text
cd upstream/Open-LLM-VTuber/client
npm run package:dev
cd ../..
docker compose -f deploy/vm1-gateway/compose.yaml config
docker compose -f deploy/vm2-tts/compose.yaml config
python scripts/validate_deployment.py --vm1-env deploy/vm1-gateway/.env.example --vm2-env deploy/vm2-tts/.env.example --allow-example
python scripts/validate_deployment.py --vm1-env deploy/vm1-gateway/.env.example --vm2-env deploy/vm2-tts/.env.example --production  # 预期拒绝
```

## 后续入口

获得实际域名、VM-2 地址和由用户管理的非空令牌后，复制 `.env.example` 为本地 `.env`，先通过生产门禁，再按 `docs/SERVER_DEPLOYMENT.md` 的 VM-2 → VM-1 顺序部署。正式模型、真实 TTS/ASR 和四 VM 拓扑按用户审计结论保持后置。
