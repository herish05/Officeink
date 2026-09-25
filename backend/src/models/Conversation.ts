import { Schema, model, Document, Types } from 'mongoose';

export type ConversationType = 'direct' | 'group';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  type: ConversationType;
  name?: string;
  avatar?: string;
  createdBy?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  isArchived: boolean;
  lastMessageAt?: Date;
  lastMessageSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    isArchived: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageSummary: { type: String, default: '' },
  },
  { timestamps: true }
);

conversationSchema.index({ type: 1, lastMessageAt: -1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
