import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Users, MessageSquare } from 'lucide-react';
import { Conversation } from '../types';
import { fetchApi } from '../services/api';
import { useChatStore } from '../store/chatStore';
import { CreateGroupModal } from '../components/CreateGroupModal';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { setActiveConversation, fetchConversations } = useChatStore();
  const navigate = useNavigate();

  const loadGroups = () => {
    fetchApi<Conversation[]>('/conversations').then(convs => {
      setGroups(convs.filter(c => c.type === 'group'));
    }).catch(() => {});
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const openGroupChat = (id: string) => {
    setActiveConversation(id);
    navigate('/chat');
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Department & Project Groups</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Collaborative Office LAN Channels and Group Messaging
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Group</span>
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              No groups created yet. Click "Create New Group" to get started.
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-indigo-500/50 transition"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white truncate">{g.name}</h3>
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">
                      {g.members?.length || 0} Group Members
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 truncate">
                      {g.lastMessageSummary || 'No recent messages'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {g.lastMessageAt ? new Date(g.lastMessageAt).toLocaleDateString() : 'Active'}
                  </span>
                  <button
                    onClick={() => openGroupChat(g._id)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Open Group</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGroupCreated={async (convId) => {
          await fetchConversations();
          openGroupChat(convId);
        }}
      />
    </div>
  );
};
