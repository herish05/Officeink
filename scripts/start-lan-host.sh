#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAN_IP="${LAN_IP:-192.168.0.26}"
MONGODB_DBPATH="$APP_DIR/data/mongo"
LOG_DIR="$APP_DIR/logs"
mkdir -p "$MONGODB_DBPATH" "$LOG_DIR"

echo "[1/5] Checking dependencies..."
command -v node >/dev/null
command -v npm >/dev/null
command -v mongod >/dev/null
command -v redis-server >/dev/null

if ! pgrep -x mongod >/dev/null 2>&1; then
  echo "[2/5] Starting MongoDB on $LAN_IP:27017"
  mongod --dbpath "$MONGODB_DBPATH" --logpath "$LOG_DIR/mongod.log" --bind_ip_all --fork
fi

if ! pgrep -x redis-server >/dev/null 2>&1; then
  echo "[2/5] Starting Redis on 0.0.0.0:6379"
  redis-server --bind 0.0.0.0 --daemonize yes
fi

cd "$APP_DIR/backend"
if [ ! -d node_modules ]; then
  echo "[3/5] Installing backend dependencies"
  npm install
fi
npm run build

cd "$APP_DIR/frontend"
if [ ! -d node_modules ]; then
  echo "[4/5] Installing frontend dependencies"
  npm install
fi
VITE_API_BASE_URL="http://${LAN_IP}:5000/api" VITE_SOCKET_URL="http://${LAN_IP}:5000" npm run build

cd "$APP_DIR"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "[5/5] Installing PM2 globally"
  npm install -g pm2
fi

pm2 delete officelink-backend >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs --name officelink-backend --env production

mkdir -p /var/www/officelink
cp -r "$APP_DIR/frontend/dist/." /var/www/officelink/

if command -v nginx >/dev/null 2>&1; then
  cp "$APP_DIR/nginx/officelink.conf" /etc/nginx/conf.d/officelink.conf
  nginx -t
  systemctl reload nginx || service nginx reload || nginx
fi

echo ""
echo "====================================="
echo "OfficeLink LAN deployment is ready"
echo "Frontend: http://${LAN_IP}"
echo "Backend:  http://${LAN_IP}:5000"
echo "Admin:    EMP001 / Admin@123"
echo "====================================="
