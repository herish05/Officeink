import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ENV } from '../config/env';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  const isMongoConnected = mongoose.connection.readyState === 1;

  res.json({
    status: isMongoConnected ? 'healthy' : 'degraded',
    app: 'OfficeLink Air-Gapped Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    lanIp: ENV.LAN_IP,
    services: {
      mongodb: isMongoConnected ? 'connected' : 'disconnected',
      redis: 'operational'
    }
  });
};
