export type Role = 'ADMIN' | 'EMPLOYEE';

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export interface User {
  _id: string;
  id?: string;
  employeeId: string;
  name: string;
  username: string;
  departmentId?: Department | string;
  role: Role;
  avatar?: string;
  phone?: string;
  email?: string;
  designation?: string;
  isActive: boolean;
  statusText?: string;
  lastSeen?: string;
}

export type ConversationType = 'direct' | 'group';

export interface ConversationMember {
  id: string;
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface FileMetadata {
  _id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  url?: string;
}

export interface MessageAttachment {
  fileId?: FileMetadata | string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  duration?: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  type: ConversationType;
  name?: string;
  avatar?: string;
  createdBy?: string;
  lastMessageAt?: string;
  lastMessageSummary?: string;
  unreadCount?: number;
  members?: ConversationMember[];
  otherUser?: User;
  lastMessage?: Message;
}

export interface AuditLog {
  _id: string;
  actorId?: User;
  actorName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  totalDisabled: number;
  totalDepartments: number;
  totalMessages: number;
  totalFiles: number;
  totalConversations: number;
  totalStorageBytes: number;
  onlineCount: number;
  lanIp: string;
  nodeVersion: string;
  uptimeSeconds: number;
}
