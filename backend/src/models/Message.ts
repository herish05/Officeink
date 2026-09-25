import { Schema, model, Document, Types } from 'mongoose';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IMessageAttachment {
  fileId: Types.ObjectId;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  duration?: number;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: MessageType;
  content: string;
  attachments: IMessageAttachment[];
  status: MessageStatus;
  deliveredTo: Types.ObjectId[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'system'], default: 'text' },
    content: { type: String, default: '' },
    attachments: [
      {
        fileId: { type: Schema.Types.ObjectId, ref: 'FileMetadata' },
        name: String,
        size: Number,
        mimeType: String,
        url: String,
        duration: Number,
      }
    ],
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);
