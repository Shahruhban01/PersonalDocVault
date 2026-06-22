#!/bin/bash
# =============================================================================
# Personal Vault — Production Deployment Script
# Backend : https://vaultapi.developerruhban.online
# Frontend: https://vault.developerruhban.online
#
# Run on your Linux server as: bash deploy.sh
# =============================================================================

set -e  # Exit immediately on any error

REPO_DIR="/var/www/docvault"
FRONTEND_DIST="$REPO_DIR/frontend-web/dist"
NGINX_HTML="/var/www/docvault/html"
LOG_DIR="$REPO_DIR/logs"

echo "============================================="
echo "  Personal Vault — Production Deployment"
echo "============================================="

# ── 1. Pull latest code ─────────────────────────────────────
echo "[1/7] Pulling latest code from repository..."
cd "$REPO_DIR"
git pull origin main

# ── 2. Install backend dependencies ────────────────────────
echo "[2/7] Installing backend dependencies..."
cd "$REPO_DIR/backend"
npm ci --omit=dev

# ── 3. Install & build frontend ─────────────────────────────
echo "[3/7] Installing frontend dependencies & building..."
cd "$REPO_DIR/frontend-web"
npm ci
npm run build

# ── 4. Deploy frontend static files ────────────────────────
echo "[4/7] Deploying frontend build to nginx root..."
mkdir -p "$NGINX_HTML"
rm -rf "$NGINX_HTML"/*
cp -r "$FRONTEND_DIST"/. "$NGINX_HTML/"
echo "  ✓ Frontend files deployed to $NGINX_HTML"

# ── 5. Create log directory ──────────────────────────────────
echo "[5/7] Setting up log directory..."
mkdir -p "$LOG_DIR"

# ── 6. Restart backend via PM2 ──────────────────────────────
echo "[6/7] Restarting backend with PM2..."
cd "$REPO_DIR"

if pm2 describe personal-vault-backend > /dev/null 2>&1; then
  pm2 reload deployment/ecosystem.config.js --update-env
  echo "  ✓ PM2 process reloaded (zero-downtime)"
else
  pm2 start deployment/ecosystem.config.js
  echo "  ✓ PM2 process started"
fi

pm2 save  # Persist process list for server reboots

# ── 7. Reload Nginx ─────────────────────────────────────────
echo "[7/7] Reloading Nginx configuration..."
nginx -t && systemctl reload nginx
echo "  ✓ Nginx reloaded"

echo ""
echo "============================================="
echo "  Deployment Complete!"
echo "  Frontend : https://vault.developerruhban.online"
echo "  Backend  : https://vaultapi.developerruhban.online"
echo "  PM2 Logs : pm2 logs personal-vault-backend"
echo "============================================="
