module.exports = {
  apps: [
    {
      name: 'officelink-backend',
      script: 'dist/server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 5000,
        MONGODB_URI: 'mongodb://localhost:27017/officelink',
        REDIS_URI: 'redis://localhost:6379',
        JWT_SECRET: 'officelink_airgapped_lan_secret_key_2026_super_secure',
        JWT_REFRESH_SECRET: 'officelink_refresh_token_secret_key_2026_super_secure',
        STORAGE_DIR: './uploads/attachments',
        TEMP_CHUNK_DIR: './uploads/chunks',
        LAN_IP: '192.168.0.26',
        CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,http://192.168.0.26,http://192.168.0.26:80'
      },
      watch: false,
      autorestart: true,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
