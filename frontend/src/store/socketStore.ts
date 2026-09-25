import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string>; // conversationId -> userName
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: {},

  connectSocket: () => {
    const token = localStorage.getItem('officelink_token');
    if (!token) return;

    const existingSocket = get().socket;
    if (existingSocket && existingSocket.connected) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      set(state => {
        const next = new Set(state.onlineUsers);
        next.add(userId);
        return { onlineUsers: next };
      });
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      set(state => {
        const next = new Set(state.onlineUsers);
        next.delete(userId);
        return { onlineUsers: next };
      });
    });

    socket.on('typing:start', ({ conversationId, userName }: { conversationId: string; userName: string }) => {
      set(state => ({
        typingUsers: { ...state.typingUsers, [conversationId]: userName }
      }));
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      set(state => {
        const next = { ...state.typingUsers };
        delete next[conversationId];
        return { typingUsers: next };
      });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
