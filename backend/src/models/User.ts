import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface IUser extends Document {
  _id: Types.ObjectId;
  employeeId: string;
  name: string;
  username: string;
  passwordHash: string;
  departmentId?: Types.ObjectId;
  role: UserRole;
  avatar?: string;
  phone?: string;
  email?: string;
  designation?: string;
  isActive: boolean;
  statusText?: string;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: false },
    role: { type: String, enum: ['ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE', index: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    designation: { type: String, default: 'Staff Member' },
    isActive: { type: Boolean, default: true, index: true },
    statusText: { type: String, default: 'Available' },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const User = model<IUser>('User', userSchema);
