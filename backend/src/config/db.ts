import mongoose from 'mongoose';
import { ENV } from './env';
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Database] MongoDB Connected to ${ENV.MONGODB_URI}`);
  } catch (error: any) {
    logger.error(`[Database] Initial Mongo Connection Warning: ${error?.message || error}`);
    logger.info('[Database] Attempting background retry for MongoDB connection...');
    // Retry periodically in background so app doesn't crash if Mongo starts up slightly later in docker-compose
    setTimeout(connectDB, 5000);
  }
};
