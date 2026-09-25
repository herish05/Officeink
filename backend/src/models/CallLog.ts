import { Schema, model, Document, Types } from 'mongoose';

export interface ICallLog extends Document {
  callerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  type: 'audio' | 'video';
  status: 'completed' | 'missed' | 'rejected' | 'busy';
  durationSeconds: number;
  startedAt: Date;
  endedAt?: Date;
}

const callLogSchema = new Schema<ICallLog>(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    type: { type: String, enum: ['audio', 'video'], default: 'audio' },
    status: { type: String, enum: ['completed', 'missed', 'rejected', 'busy'], default: 'completed' },
    durationSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export const CallLog = model<ICallLog>('CallLog', callLogSchema);
