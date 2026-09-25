import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/officelink',
  REDIS_URI: process.env.REDIS_URI || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'officelink_airgapped_lan_secret_key_2026_super_secure',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'officelink_refresh_token_secret_key_2026_super_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  STORAGE_DIR: path.resolve(process.env.STORAGE_DIR || './uploads/attachments'),
  TEMP_CHUNK_DIR: path.resolve(process.env.TEMP_CHUNK_DIR || './uploads/chunks'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '5000', 10),
  LAN_IP: process.env.LAN_IP || '192.168.29.237',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://192.168.29.237,http://192.168.29.237:80'
};
