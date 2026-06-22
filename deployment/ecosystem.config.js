/**
 * @fileoverview PM2 process manager configuration for high-availability backend clustering.
 * Production domains:
 *   Backend : https://vaultapi.developerruhban.online
 *   Frontend: https://vault.developerruhban.online
 */

module.exports = {
  apps: [
    {
      name: 'personal-vault-backend',
      script: './backend/src/app.js',
      cwd: '../',
      instances: 'max',         // Scale to all available CPU cores
      exec_mode: 'cluster',     // Load-balanced cluster mode
      watch: false,
      max_memory_restart: '400M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: './backend/.env',  // Load full .env on start
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      combine_logs: true,
      merge_logs: true
    }
  ]
};
