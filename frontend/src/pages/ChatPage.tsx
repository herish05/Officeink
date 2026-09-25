import React, { useEffect, useState, useRef } from 'react';
import { Phone, Video, Search, Info, X, Radio } from 'lucide-react';
import { ConversationList } from '../components/ConversationList';
import { MessageItem } from '../components/MessageItem';
import { MessageInput } from '../components/MessageInput';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { useChatStore } from '../store/chatStore';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../services/api';
import { User } from '../types';

export const ChatPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messages,
    fetchConversations,
    setActiveConversation,
    addMessage,
    setCallState
  } = useChatStore();

  const { socket, onlineUsers, typingUsers } = useSocketStore();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showDirectPicker, setShowDirectPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchApi<User[]>('/users').then(setUsersList).catch(() => {});
  }, []);

  // Listen to incoming real-time Socket messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      addMessage(msg.conversationId, msg);
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  const activeConv = conversations.find(c => c._id === activeConversationId);
  const currentMessages = activeConversationId ? (messages[activeConversationId] || []) : [];

  const otherUser = activeConv?.otherUser;
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser._id) : false;
  const currentTypingUser = activeConversationId ? typingUsers[activeConversationId] : null;

  const handleSendMessage = (content: string, attachments?: any[]) => {
    if (!activeConversationId || !socket) return;
    socket.emit('message:send', {
      conversationId: activeConversationId,
      type: attachments && attachments.length > 0 ? attachments[0].mimeType.split('/')[0] : 'text',
      content,
      attachments
    });
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!otherUser || !socket) return;
    setCallState({
      active: true,
      isIncoming: false,
      type,
      targetUser: { id: otherUser._id, name: otherUser.name, employeeId: otherUser.employeeId }
    });
    socket.emit('call:initiate', {
      targetUserId: otherUser._id,
      conversationId: activeConversationId || undefined,
      type
    });
  };

  const startDirectChat = async (targetUserId: string) => {
    setShowDirectPicker(false);
    try {
      const result = await fetchApi<{ id: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: 'direct', participantUserId: targetUserId })
      });
      await fetchConversations();
      setActiveConversation(result.id);
    } catch (err: any) {
      alert(`Error starting chat: ${err.message}`);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-950 overflow-hidden">
      {/* Sidebar Conversation List */}
      <ConversationList
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversation}
        onOpenCreateGroup={() => setIsGroupModalOpen(true)}
        onOpenNewDirect={() => setShowDirectPicker(true)}
      />

      {/* Main Chat Panel */}
      {activeConv ? (
        <div className="flex-1 flex flex-col h-full bg-slate-950">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-indigo-400">
                  {activeConv.type === 'group' ? activeConv.name?.charAt(0) : otherUser?.name.charAt(0)}
                </div>
                {activeConv.type === 'direct' && (
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      isOtherOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'
                    }`}
                  />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {activeConv.type === 'group' ? activeConv.name : otherUser?.name}
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  {activeConv.type === 'group'
                    ? `${activeConv.members?.length || 0} members in group`
                    : `${otherUser?.designation || 'Staff'} • ${isOtherOnline ? '🟢 Online' : '⚪ Offline'}`}
                </p>
              </div>
            </div>

            {/* Actions: Audio Call, Video Call */}
            {activeConv.type === 'direct' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleStartCall('audio')}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition"
                  title="Start Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition"
                  title="Start Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Radio className="w-8 h-8 mb-2 animate-pulse text-indigo-500" />
                <p>No messages yet. Send a message or file to start communicating!</p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <MessageItem
                  key={msg._id}
                  message={msg}
                  isSelf={typeof msg.senderId === 'object' ? msg.senderId._id === currentUser?._id : msg.senderId === currentUser?._id}
                  onPreviewImage={setPreviewImageUrl}
                />
              ))
            )}

            {/* Typing Indicator Bubble */}
            {currentTypingUser && (
              <div className="text-[11px] font-mono text-indigo-400 italic py-1 animate-pulse">
                {currentTypingUser} is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <MessageInput conversationId={activeConversationId!} onSendMessage={handleSendMessage} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 select-none">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
            <Radio className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">OfficeLink LAN Platform</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
            Select an employee or group from the sidebar to send messages, transfer files, or make WebRTC calls inside your office network.
          </p>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={previewImageUrl} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain" />
        </div>
      )}

      {/* Direct Chat Picker Modal */}
      {showDirectPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Select Employee for Private Chat</h3>
              <button onClick={() => setShowDirectPicker(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
              {usersList.map(u => (
                <div
                  key={u._id}
                  onClick={() => startDirectChat(u._id)}
                  className="p-2.5 rounded-lg flex items-center justify-between hover:bg-slate-900 cursor-pointer transition text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{u.employeeId} • {u.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={async (convId) => {
          await fetchConversations();
          setActiveConversation(convId);
        }}
      />
    </div>
  );
};
