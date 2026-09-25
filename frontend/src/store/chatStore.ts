import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { fetchApi } from '../services/api';

interface CallState {
  active: boolean;
  isIncoming: boolean;
  callId?: string;
  type?: 'audio' | 'video';
  caller?: { id: string; name: string; employeeId: string };
  targetUser?: { id: string; name: string; employeeId: string };
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  callState: CallState;
  
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => void;
  setCallState: (callState: Partial<CallState>) => void;
  resetCallState: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  callState: { active: false, isIncoming: false },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const data = await fetchApi<Conversation[]>('/conversations');
      set({ conversations: data, isLoadingConversations: false });
    } catch (err) {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
    if (conversationId) {
      // Clear unread badge locally
      set(state => ({
        conversations: state.conversations.map(c =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      }));
      get().fetchMessages(conversationId);
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    try {
      const result = await fetchApi<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);
      set(state => ({
        messages: { ...state.messages, [conversationId]: result.messages },
        isLoadingMessages: false
      }));
    } catch (err) {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (conversationId: string, message: Message) => {
    set(state => {
      const currentList = state.messages[conversationId] || [];
      // avoid duplicates
      if (currentList.some(m => m._id === message._id)) {
        return state;
      }

      const updatedList = [...currentList, message];
      const isCurrentActive = state.activeConversationId === conversationId;

      const updatedConversations = state.conversations.map(c => {
        if (c._id === conversationId) {
          return {
            ...c,
            lastMessageAt: message.createdAt,
            lastMessageSummary: message.content || `Sent ${message.type}`,
            unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + 1,
            lastMessage: message
          };
        }
        return c;
      });

      return {
        messages: { ...state.messages, [conversationId]: updatedList },
        conversations: updatedConversations
      };
    });
  },

  setCallState: (partialState: Partial<CallState>) => {
    set(state => ({ callState: { ...state.callState, ...partialState } }));
  },

  resetCallState: () => {
    set({ callState: { active: false, isIncoming: false } });
  }
}));
