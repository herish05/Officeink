import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { ConversationMember } from '../models/ConversationMember';
import { CallLog } from '../models/CallLog';
import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      userId: string;
      employeeId: string;
      role: 'ADMIN' | 'EMPLOYEE';
      name: string;
    };
  };
}

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 1e8 // 100 MB buffer
  });

  // Handshake Authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).lean();

      if (!user || !user.isActive) {
        return next(new Error('User account disabled or invalid'));
      }

      socket.data.user = {
        userId: user._id.toString(),
        employeeId: user.employeeId,
        role: user.role,
        name: user.name
      };

      next();
    } catch (err: any) {
      logger.warn(`[Socket Auth] Connection rejected: ${err.message}`);
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) return;

    logger.info(`[Socket] Connected: ${user.name} (${user.employeeId}) [${socket.id}]`);

    const redis = getRedisClient();
    const userId = user.userId;

    // Join personal user room
    socket.join(`user:${userId}`);

    // Set online presence in Redis
    await redis.set(`online:user:${userId}`, socket.id, 'EX', 86400);

    // Broadcast user online to everyone
    io.emit('user:online', { userId, employeeId: user.employeeId, name: user.name });

    // Join all conversation rooms user is a member of
    const memberships = await ConversationMember.find({ userId }).lean();
    memberships.forEach(m => {
      socket.join(`conversation:${m.conversationId.toString()}`);
    });

    // -------------------------------------------------------------
    // CHAT & MESSAGING EVENTS
    // -------------------------------------------------------------

    // Send Message
    socket.on('message:send', async (data: { conversationId: string; type?: string; content?: string; attachments?: any[] }) => {
      try {
        const { conversationId, type, content, attachments } = data;
        if (!conversationId) return;

        const isMember = await ConversationMember.findOne({ conversationId, userId }).lean();
        if (!isMember) return;

        const newMsg = await Message.create({
          conversationId,
          senderId: userId,
          type: type || 'text',
          content: content || '',
          attachments: attachments || [],
          status: 'sent',
          readBy: [userId]
        });

        const summaryText = content ? (content.length > 40 ? content.substring(0, 40) + '...' : content) : `Sent ${type || 'file'}`;

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date(),
          lastMessageSummary: summaryText
        });

        await ConversationMember.updateMany(
          { conversationId, userId: { $ne: userId } },
          { $inc: { unreadCount: 1 } }
        );

        const populatedMsg = await Message.findById(newMsg._id)
          .populate('senderId', 'name employeeId avatar designation role')
          .populate('attachments.fileId')
          .lean();

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', populatedMsg);
      } catch (err: any) {
        logger.error(`[Socket message:send error] ${err.message}`);
      }
    });

    // Typing Indicators
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { conversationId, userId, userName: user.name });
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId });
    });

    // Read Receipt
    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      try {
        await ConversationMember.updateOne({ conversationId, userId }, { unreadCount: 0 });
        socket.to(`conversation:${conversationId}`).emit('message:read', { conversationId, userId });
      } catch (err: any) {
        logger.error(`[Socket message:read error] ${err.message}`);
      }
    });

    // Join new conversation room dynamically (e.g. after group creation)
    socket.on('conversation:join', ({ conversationId }: { conversationId: string }) => {
      socket.join(`conversation:${conversationId}`);
    });

    // -------------------------------------------------------------
    // WEBRTC AUDIO & VIDEO CALL SIGNALING EVENTS
    // -------------------------------------------------------------

    // Initiate Call
    socket.on('call:initiate', async (data: { targetUserId: string; conversationId?: string; type: 'audio' | 'video' }) => {
      const { targetUserId, conversationId, type } = data;
      logger.info(`[WebRTC Call] Initiate ${type} call from ${user.name} to ${targetUserId}`);

      const callLog = await CallLog.create({
        callerId: userId,
        receiverId: targetUserId,
        conversationId: conversationId || undefined,
        type: type || 'audio',
        status: 'completed',
        startedAt: new Date()
      });

      io.to(`user:${targetUserId}`).emit('call:incoming', {
        callId: callLog._id.toString(),
        caller: {
          id: userId,
          name: user.name,
          employeeId: user.employeeId
        },
        conversationId,
        type
      });
    });

    // Accept Call
    socket.on('call:accept', ({ callerId, callId }: { callerId: string; callId?: string }) => {
      logger.info(`[WebRTC Call] Accept call from ${user.name} to caller ${callerId}`);
      io.to(`user:${callerId}`).emit('call:accepted', {
        acceptedBy: { id: userId, name: user.name },
        callId
      });
    });

    // Reject Call
    socket.on('call:reject', async ({ callerId, callId, reason }: { callerId: string; callId?: string; reason?: string }) => {
      logger.info(`[WebRTC Call] Reject call from ${user.name} to caller ${callerId}`);
      if (callId) {
        await CallLog.findByIdAndUpdate(callId, { status: 'rejected' });
      }
      io.to(`user:${callerId}`).emit('call:rejected', {
        rejectedBy: { id: userId, name: user.name },
        reason: reason || 'Declined'
      });
    });

    // End Call
    socket.on('call:end', async ({ targetUserId, callId, durationSeconds }: { targetUserId: string; callId?: string; durationSeconds?: number }) => {
      logger.info(`[WebRTC Call] End call between ${userId} and ${targetUserId}`);
      if (callId) {
        await CallLog.findByIdAndUpdate(callId, {
          status: 'completed',
          durationSeconds: durationSeconds || 0,
          endedAt: new Date()
        });
      }
      io.to(`user:${targetUserId}`).emit('call:ended', { endedBy: userId });
    });

    // WebRTC Peer-to-Peer Signaling forwarding (SDP Offer, Answer, ICE Candidates)
    socket.on('webrtc:offer', ({ targetUserId, sdp }: { targetUserId: string; sdp: any }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:offer', { fromUserId: userId, sdp });
    });

    socket.on('webrtc:answer', ({ targetUserId, sdp }: { targetUserId: string; sdp: any }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:answer', { fromUserId: userId, sdp });
    });

    socket.on('webrtc:ice-candidate', ({ targetUserId, candidate }: { targetUserId: string; candidate: any }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', { fromUserId: userId, candidate });
    });

    // -------------------------------------------------------------
    // DISCONNECT EVENT
    // -------------------------------------------------------------
    socket.on('disconnect', async () => {
      logger.info(`[Socket] Disconnected: ${user.name} (${user.employeeId})`);

      await redis.del(`online:user:${userId}`);
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

      io.emit('user:offline', { userId, employeeId: user.employeeId, lastSeen: new Date() });
    });
  });

  return io;
};
