import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, MessageSquare, PhoneCall, Shield, Radio } from 'lucide-react';
import { User, Department } from '../types';
import { fetchApi } from '../services/api';
import { useSocketStore } from '../store/socketStore';
import { useChatStore } from '../store/chatStore';

export const DirectoryPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const { onlineUsers } = useSocketStore();
  const { setActiveConversation, fetchConversations } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchApi<User[]>('/users'),
      fetchApi<Department[]>('/departments')
    ]).then(([uData, dData]) => {
      setUsers(uData);
      setDepartments(dData);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const handleStartChat = async (targetUserId: string) => {
    try {
      const result = await fetchApi<{ id: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: 'direct', participantUserId: targetUserId })
      });
      await fetchConversations();
      setActiveConversation(result.id);
      navigate('/chat');
    } catch (err: any) {
      alert(`Error starting chat: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const deptId = typeof u.departmentId === 'object' ? u.departmentId?._id : u.departmentId;
    if (selectedDept && deptId !== selectedDept) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.employeeId.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Employee Directory</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Air-Gapped Local Network Company Contacts & Staff Directory
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-semibold">
            {users.length} Active Employees
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedDept('')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex-shrink-0 ${
                selectedDept === '' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Departments
            </button>
            {departments.map((d) => (
              <button
                key={d._id}
                onClick={() => setSelectedDept(d._id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex-shrink-0 ${
                  selectedDept === d._id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs">Loading directory...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const isOnline = onlineUsers.has(u._id);
              const deptName = typeof u.departmentId === 'object' ? u.departmentId?.name : 'General';

              return (
                <div
                  key={u._id}
                  className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition flex flex-col justify-between"
                >
                  <div className="flex items-start space-x-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white truncate">{u.name}</h3>
                        {u.role === 'ADMIN' && (
                          <span title="Administrator">
                            <Shield className="w-3.5 h-3.5 text-indigo-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-indigo-300 font-semibold">{u.employeeId}</p>
                      <p className="text-xs text-slate-400 mt-1 truncate">{u.designation || 'Staff Member'}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded text-[10px] font-medium">
                        {deptName}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                      {u.statusText || (isOnline ? 'Available' : 'Offline')}
                    </span>
                    <button
                      onClick={() => handleStartChat(u._id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
