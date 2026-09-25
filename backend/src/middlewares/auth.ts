import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { User } from '../models/User';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { name?: string; departmentId?: string };
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.query && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const decoded = verifyAccessToken(token);
    const userDoc = await User.findById(decoded.userId).lean();

    if (!userDoc || !userDoc.isActive) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User account disabled or deleted' } });
      return;
    }

    req.user = {
      userId: decoded.userId,
      employeeId: decoded.employeeId,
      role: decoded.role,
      name: userDoc.name,
      departmentId: userDoc.departmentId ? userDoc.departmentId.toString() : undefined
    };

    next();
  } catch (error: any) {
    logger.warn(`[AuthMiddleware] JWT Verification Failed: ${error?.message}`);
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid' } });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin privileges required' } });
    return;
  }
  next();
};
