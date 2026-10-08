#!/usr/bin/env bash
# FaFa 前端一键部署脚本（Vue3 + Vite，nginx 容器 + 反代后端）
# 用法: ./deploy.sh [up|down|ps|logs|rebuild]   （默认 up）
set -euo pipefail

# 兼容精简 PATH 环境（某些自动化 shell），确保 ipconfig/ifconfig/hostname 可用
export PATH="/usr/sbin:/sbin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OS_TYPE="$(uname -s)"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ 未找到 docker compose / docker-compose，请先安装 Docker Desktop / Docker Engine。" >&2
  exit 1
fi

lan_ip() {
  if [ "$OS_TYPE" = "Darwin" ]; then
    local i ip
    for i in en0 en1; do
      ip="$(ipconfig getifaddr "$i" 2>/dev/null || true)"
      [ -n "$ip" ] && { echo "$ip"; return; }
    done
  else
    hostname -I 2>/dev/null | awk '{print $1}'
  fi
}

ensure_network() {
  if ! docker network inspect fafa-net >/dev/null 2>&1; then
    docker network create fafa-net >/dev/null
    echo "🔗 已创建共享网络 fafa-net"
  fi
}

print_urls() {
  local ip; ip="$(lan_ip)"
  echo ""
  echo "======================================================"
  echo " ✅ FaFa 前端服务已就绪"
  echo "------------------------------------------------------"
  echo "   前端网站    http://127.0.0.1:3000"
  echo "   产品文档    http://127.0.0.1:8889"
  if [ -n "$ip" ]; then
    echo "   局域网访问  http://$ip:3000"
  fi
  echo "------------------------------------------------------"
  echo "   后端默认走共享网络 fafacms:8080"
  echo "   跨机部署请设 BACKEND_UPSTREAM=后端IP:8080 后 rebuild"
  echo "======================================================"
}

up() {
  ensure_network
  echo "🚀 构建并启动前端（首次需拉取镜像，可能较慢）..."
  local n=0
  until $DC up -d --build; do
    n=$((n+1))
    if [ $n -ge 4 ]; then
      echo "❌ 启动失败，请检查网络 / 镜像拉取。" >&2
      exit 1
    fi
    echo "⚠️  启动失败，6 秒后重试 ($n/3)..."
    sleep 6
  done
  print_urls
}

case "${1:-up}" in
  up)      up ;;
  down)    $DC down ;;
  ps)      $DC ps ;;
  logs)    $DC logs -f --tail 50 ;;
  rebuild) $DC up -d --build --force-recreate; print_urls ;;
  *)       echo "用法: $0 [up|down|ps|logs|rebuild]" ;;
esac
