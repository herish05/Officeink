import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { errorHandler } from './middlewares/error';
import { ENV } from './config/env';

const app = express();

const allowedOrigins = ENV.CORS_ORIGINS.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Enable CORS for LAN access
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const lanOriginRegex = /^http:\/\/192\.168\.(\d+)\.(\d+)(?::\d+)?$/;
    if (lanOriginRegex.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure upload directories exist
if (!fs.existsSync(ENV.STORAGE_DIR)) {
  fs.mkdirSync(ENV.STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(ENV.TEMP_CHUNK_DIR)) {
  fs.mkdirSync(ENV.TEMP_CHUNK_DIR, { recursive: true });
}

// Mount REST API
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
