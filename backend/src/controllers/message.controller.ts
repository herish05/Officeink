import { Response } from 'express';
import { Message } from '../models/Message';
import { ConversationMember } from '../models/ConversationMember';
import { Conversation } from '../models/Conversation';
import { AuthenticatedRequest } from '../middlewares/auth';
import logger from '../utils/logger';

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    // Verify user is a member of the conversation
    const isMember = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!isMember) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation' } });
      return;
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name employeeId avatar designation role')
      .populate('attachments.fileId')
      .lean();

    const total = await Message.countDocuments({ conversationId });

    // Mark unread count as 0 for this member
    await ConversationMember.updateOne({ conversationId, userId }, { unreadCount: 0 });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    logger.error(`[MessageController] getMessages error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const sendMessageREST = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { conversationId, type, content, attachments } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const isMember = await ConversationMember.findOne({ conversationId, userId }).lean();
    if (!isMember) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this conversation' } });
      return;
    }

    const newMsg = await Message.create({
      conversationId,
      senderId: userId,
      type: type || 'text',
      content: content || '',
      attachments: attachments || [],
      status: 'sent',
      readBy: [userId]
    });

    // Update conversation lastMessageAt
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
      lastMessageSummary: content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : `Sent ${type || 'file'}`
    });

    // Increment unread counts for all members except sender
    await ConversationMember.updateMany(
      { conversationId, userId: { $ne: userId } },
      { $inc: { unreadCount: 1 } }
    );

    const populatedMsg = await Message.findById(newMsg._id)
      .populate('senderId', 'name employeeId avatar designation role')
      .populate('attachments.fileId')
      .lean();

    res.status(201).json({ success: true, data: populatedMsg });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
