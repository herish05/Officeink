import { Schema, model, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  key: string;
  value: any;
  description?: string;
  updatedBy?: string;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
    updatedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

export const SystemSetting = model<ISystemSetting>('SystemSetting', systemSettingSchema);
