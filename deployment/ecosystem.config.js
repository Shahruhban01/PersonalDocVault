/**
 * @fileoverview PM2 process manager configuration for high-availability backend clustering.
 */

module.exports = {
  apps: [
    {
      name: 'personal-vault-backend',
      script: './backend/src/app.js',
      cwd: '../', // Set current working directory to repository root
      instances: 'max', // Scale to all available CPU cores
      exec_mode: 'cluster', // Run in cluster mode for load balancing
      watch: false, // Do not watch files for changes in production
      max_memory_restart: '400M', // Restart process if memory exceeds 400MB
      autorestart: true, // Enable automatic restarts on failures
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      combine_logs: true,
      merge_logs: true
    }
  ]
};
