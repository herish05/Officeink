import { z } from 'zod';

export const loginSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  employeeId: z.string().min(2, 'Employee ID must be at least 2 characters'),
  name: z.string().min(2, 'Name is required'),
  username: z.string().min(2, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  departmentId: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
  designation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().min(2, 'Department code is required'),
  description: z.string().optional(),
});

export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']),
  participantUserId: z.string().optional(), // for direct
  name: z.string().optional(), // for group
  memberUserIds: z.array(z.string()).optional(), // for group
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  type: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
  content: z.string().optional(),
  attachments: z.array(z.object({
    fileId: z.string(),
    name: z.string(),
    size: z.number(),
    mimeType: z.string(),
    url: z.string().optional(),
    duration: z.number().optional()
  })).optional(),
});
