# 两台 VM 部署指南

当前执行拓扑固定为两台 Ubuntu 22.04 VM：

- VM-1：Caddy HTTP/HTTPS、orchestrator、备用 Mock TTS。
- VM-2：主 Mock TTS、Mock ASR、健康检查入口。

本指南只覆盖可回滚的 Compose 配置检查和服务更新，不执行 Azure VNet、NSG、DNS 或系统防火墙修改。正式域名、证书和非空令牌由拥有者在云平台侧完成并记录。

## 1. 配置检查

在仓库根目录执行：

```bash
docker compose -f deploy/vm1-gateway/compose.yaml config
docker compose -f deploy/vm2-tts/compose.yaml config
python scripts/validate_deployment.py \
  --vm1-env deploy/vm1-gateway/.env.example \
  --vm2-env deploy/vm2-tts/.env.example \
  --allow-example
```

示例文件只用于本地演示，`API_TOKEN` 为空且域名为 `localhost`。公网或生产部署必须复制为 `.env`，填入非空随机令牌、正式域名和 VM-2 可达地址，然后执行：

```bash
python scripts/validate_deployment.py \
  --vm1-env deploy/vm1-gateway/.env \
  --vm2-env deploy/vm2-tts/.env \
  --production
```

脚本不会输出令牌或其他敏感值。

## 2. 启动和健康检查

先更新 VM-2，再更新 VM-1：

```bash
docker compose -f deploy/vm2-tts/compose.yaml up -d --build
docker compose -f deploy/vm1-gateway/compose.yaml up -d --build
curl http://127.0.0.1/tts/api/health
curl http://127.0.0.1/asr/api/health
curl https://<vm1-domain>/api/health
```

VM-1 的 orchestrator 必须把 `PRIMARY_TTS_URL` 和 `PRIMARY_ASR_URL` 指向 VM-2 的边缘或私网地址。健康检查只验证服务状态，不调用真实供应商。

## 3. 回滚

部署前记录当前镜像和 Compose 配置：

```bash
docker compose -f deploy/vm1-gateway/compose.yaml ps
docker compose -f deploy/vm2-tts/compose.yaml ps
docker image ls
```

回滚时切回已验证的 Git 提交或镜像标签，然后按 VM-2 → VM-1 顺序重新执行 `up -d`。不得删除数据卷；Caddy 证书和配置卷必须保留。

## 4. 资源边界

两台 VM 均为 2 vCPU / 1 GiB。Compose 已设置容器内存和 CPU 上限；演示并发、P95、可用内存和 OOM 判定以 `docs/EXECUTION_PLAN.md` 第 4 节为准。真实模型或本地语音模型不得部署到这两台 VM。
