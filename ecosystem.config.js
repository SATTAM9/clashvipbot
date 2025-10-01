module.exports = {
  apps: [{
    name: 'clashvip',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // إعادة التشغيل في حالة التعليق
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 3000,
    // إعادة التشغيل عند الأخطاء
    max_restarts: 10,
    min_uptime: '10s'
  }]
};