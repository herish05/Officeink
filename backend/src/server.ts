import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocketServer } from './sockets/socket.server';
import { ENV } from './config/env';
import logger from './utils/logger';

const startServer = async () => {
  try {
    // Connect Database
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = initSocketServer(server);

    server.listen(ENV.PORT, ENV.HOST, () => {
      logger.info(`========================================================`);
      logger.info(`🚀 OfficeLink Backend Server is RUNNING on LAN!`);
      logger.info(`📡 Listening on: http://${ENV.HOST}:${ENV.PORT}`);
      logger.info(`🌐 Local IP Access: http://${ENV.LAN_IP}:${ENV.PORT}`);
      logger.info(`🔒 Air-Gapped Mode: ACTIVE (100% Offline LAN Compatible)`);
      logger.info(`========================================================`);
    });
  } catch (error: any) {
    logger.error(`Failed to start OfficeLink server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
