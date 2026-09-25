import { Schema, model, Document, Types } from 'mongoose';

export interface IFileMetadata extends Document {
  _id: Types.ObjectId;
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
  senderId: Types.ObjectId;
  conversationId: Types.ObjectId;
  storagePath: string;
  checksum?: string;
  isCompleted: boolean;
  totalChunks?: number;
  uploadedChunks?: number;
  createdAt: Date;
  updatedAt: Date;
}

const fileMetadataSchema = new Schema<IFileMetadata>(
  {
    originalName: { type: String, required: true },
    storageName: { type: String, required: true, unique: true, index: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    storagePath: { type: String, required: true },
    checksum: { type: String, default: '' },
    isCompleted: { type: Boolean, default: true },
    totalChunks: { type: Number, default: 1 },
    uploadedChunks: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const FileMetadata = model<IFileMetadata>('FileMetadata', fileMetadataSchema);
