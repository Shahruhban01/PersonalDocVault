#!/bin/bash
/**
 * @fileoverview Automated native deployment script for Personal Vault backend and web frontend.
 */

# Exit immediately if any command exits with a non-zero status
set -e

echo "=== Personal Vault Deployment Pipeline ==="
echo "[1/7] Fetching latest codebase changes..."
git pull origin main

echo "[2/7] Installing workspace dependencies..."
npm install

echo "[3/7] Running backend validation test suites..."
cd backend
npm install
npm run test
cd ..

echo "[4/7] Compiling static React client production bundle..."
cd frontend-web
npm install
npm run build
cd ..

echo "[5/7] Synchronizing static bundles to Nginx Document Root..."
# Ensure the destination directories exist on the hosting server
sudo mkdir -p /var/www/docvault/html
sudo cp -r ./frontend-web/dist/* /var/www/docvault/html/
sudo chown -R www-data:www-data /var/www/docvault/html/

echo "[6/7] Applying zero-downtime PM2 clustering process reload..."
cd deployment
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
cd ..

echo "[7/7] Verifying and reloading Nginx service proxy..."
sudo nginx -t
sudo systemctl reload nginx

echo "=== Deployment Pipeline Executed Successfully! ==="
