import React, { useState } from 'react';
import { Search, Plus, Users, MessageSquare } from 'lucide-react';
import { Conversation } from '../types';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenCreateGroup: () => void;
  onOpenNewDirect: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  onSelect,
  onOpenCreateGroup,
  onOpenNewDirect,
}) => {
  const [search, setSearch] = useState('');
  const { onlineUsers } = useSocketStore();
  const { user: currentUser } = useAuthStore();

  const filtered = conversations.filter((c) => {
    if (c.type === 'group') {
      return c.name?.toLowerCase().includes(search.toLowerCase());
    }
    return c.otherUser?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.otherUser?.employeeId.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Header & Search */}
      <div className="p-4 space-y-3 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight">Messages</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={onOpenNewDirect}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition"
              title="New Direct Message"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreateGroup}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition"
              title="Create Group Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No conversations found.
          </div>
        ) : (
          filtered.map((conv) => {
            const isGroup = conv.type === 'group';
            const otherUser = conv.otherUser;
            const isOnline = otherUser ? onlineUsers.has(otherUser._id) : false;
            const isActive = activeId === conv._id;

            const title = isGroup ? conv.name : (otherUser?.name || 'Direct Chat');
            const subTitle = isGroup
              ? `${conv.members?.length || 0} members`
              : otherUser?.designation || otherUser?.employeeId;

            return (
              <div
                key={conv._id}
                onClick={() => onSelect(conv._id)}
                className={`p-3 flex items-center space-x-3 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                    : 'hover:bg-slate-800/50 border-l-4 border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-300 font-bold text-sm">
                      {(title || 'C').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {!isGroup && (
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-100 truncate">
                      {title}
                    </h3>
                    {conv.lastMessageAt && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {conv.lastMessageSummary || subTitle}
                  </p>
                </div>

                {/* Unread Badge */}
                {!!conv.unreadCount && conv.unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
