import { Response } from 'express';
import { Types } from 'mongoose';
import { Conversation } from '../models/Conversation';
import { ConversationMember } from '../models/ConversationMember';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAuditEvent } from '../utils/audit';
import logger from '../utils/logger';

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const memberships = await ConversationMember.find({ userId }).lean();
    const conversationIds = memberships.map(m => m.conversationId);

    const conversations = await Conversation.find({ _id: { $in: conversationIds } })
      .sort({ lastMessageAt: -1 })
      .lean();

    const results = await Promise.all(
      conversations.map(async (conv) => {
        const membership = memberships.find(m => m.conversationId.toString() === conv._id.toString());
        const members = await ConversationMember.find({ conversationId: conv._id })
          .populate('userId', 'name employeeId username avatar designation role departmentId statusText lastSeen')
          .lean();

        let otherUser = null;
        if (conv.type === 'direct') {
          const otherMember = members.find(m => m.userId && (m.userId as any)._id.toString() !== userId);
          if (otherMember) {
            otherUser = otherMember.userId;
          }
        }

        const lastMessage = await Message.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'name employeeId')
          .lean();

        return {
          ...conv,
          unreadCount: membership ? membership.unreadCount : 0,
          members: members.map(m => ({
            id: m._id,
            user: m.userId,
            role: m.role,
            joinedAt: m.joinedAt
          })),
          otherUser,
          lastMessage
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error(`[ConversationController] getConversations error: ${error.message}`);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const { type, participantUserId, name, memberUserIds } = req.body;

    if (type === 'direct') {
      if (!participantUserId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'participantUserId is required for direct chat' } });
        return;
      }

      // Check existing direct conversation
      const userConvs = await ConversationMember.find({ userId }).select('conversationId').lean();
      const userConvIds = userConvs.map(c => c.conversationId);

      const existingDirectMember = await ConversationMember.findOne({
        userId: participantUserId,
        conversationId: { $in: userConvIds }
      }).lean();

      if (existingDirectMember) {
        const conv = await Conversation.findOne({ _id: existingDirectMember.conversationId, type: 'direct' }).lean();
        if (conv) {
          res.json({ success: true, data: { id: conv._id, conversationId: conv._id, isExisting: true } });
          return;
        }
      }

      // Create new direct conversation
      const newConv = await Conversation.create({
        type: 'direct',
        createdBy: userId,
        lastMessageAt: new Date()
      });

      await ConversationMember.create([
        { conversationId: newConv._id, userId: new Types.ObjectId(userId), role: 'admin' },
        { conversationId: newConv._id, userId: new Types.ObjectId(participantUserId), role: 'member' }
      ]);

      res.status(201).json({ success: true, data: { id: newConv._id, conversationId: newConv._id } });
      return;
    }

    if (type === 'group') {
      if (!name) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Group name is required' } });
        return;
      }

      const newConv = await Conversation.create({
        type: 'group',
        name: name.trim(),
        createdBy: userId,
        lastMessageAt: new Date()
      });

      const allMemberIds = Array.from(new Set([userId, ...(memberUserIds || [])]));

      const memberDocs = allMemberIds.map(mId => ({
        conversationId: newConv._id,
        userId: new Types.ObjectId(mId),
        role: mId === userId ? 'admin' : 'member'
      }));

      await ConversationMember.create(memberDocs);

      await logAuditEvent({
        actorId: userId,
        actorName: req.user?.name,
        action: 'CREATE_GROUP_CONVERSATION',
        resourceType: 'CONVERSATION',
        resourceId: newConv._id.toString(),
        details: { groupName: name, memberCount: allMemberIds.length }
      });

      res.status(201).json({ success: true, data: { id: newConv._id, conversationId: newConv._id } });
      return;
    }

    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid conversation type' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
