module.exports = {
  apps: [{
    name: 'burgerpos',
    script: './backend/src/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3004,
      LD_LIBRARY_PATH: '/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu',
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'false'
    },
    error_file: './backend/logs/err.log',
    out_file: './backend/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
