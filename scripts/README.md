# scripts

包含两台 VM 的健康检查和部署配置校验脚本。当前不执行远程防火墙、DNS 或 VM 拓扑修改。

健康检查默认面向本地演示入口：

```bash
./scripts/healthcheck.sh
```

远程或 HTTPS 验证时传入完整边缘地址；`VM2_BASE_URL` 使用 VM-2 的 Caddy 根地址，脚本会检查 `/tts` 和 `/asr` 路径：

```bash
INSECURE=1 VM1_BASE_URL=https://vm1.example VM2_BASE_URL=https://vm2.example ./scripts/healthcheck.sh
```

校验环境文件（不输出令牌）：

```bash
python scripts/validate_deployment.py \
  --vm1-env deploy/vm1-gateway/.env.example \
  --vm2-env deploy/vm2-tts/.env.example \
  --allow-example
```
