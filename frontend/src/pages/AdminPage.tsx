import React, { useEffect, useState } from 'react';
import { Shield, Users, HardDrive, MessageSquare, Activity, UserPlus, Database, History, RefreshCw, Key, Power, Building2, Check, Download } from 'lucide-react';
import { fetchApi } from '../services/api';
import { User, Department, AuditLog, DashboardStats } from '../types';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'departments' | 'audit' | 'backups'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Employee Form state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [newDeptId, setNewDeptId] = useState('');

  // New Department Form state
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // Reset Password State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sData, uData, dData, aData] = await Promise.all([
        fetchApi<DashboardStats>('/admin/stats'),
        fetchApi<User[]>('/users'),
        fetchApi<Department[]>('/departments'),
        fetchApi<{ logs: AuditLog[] }>('/admin/audit-logs')
      ]);

      setStats(sData);
      setUsers(uData);
      setDepartments(dData);
      setAuditLogs(aData.logs);
    } catch (err: any) {
      alert(`Error loading admin data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: newEmpId,
          name: newName,
          username: newUsername,
          password: newPassword,
          role: newRole,
          departmentId: newDeptId || undefined
        })
      });
      setIsAddUserOpen(false);
      setNewEmpId(''); setNewName(''); setNewUsername(''); setNewPassword('');
      loadData();
    } catch (err: any) {
      alert(`Error creating employee: ${err.message}`);
    }
  };

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    try {
      await fetchApi(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentActive })
      });
      loadData();
    } catch (err: any) {
      alert(`Error updating user status: ${err.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPasswordVal) return;
    try {
      await fetchApi(`/admin/users/${resetUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: resetPasswordVal })
      });
      setResetUserId(null);
      setResetPasswordVal('');
      alert('Password reset successfully!');
    } catch (err: any) {
      alert(`Error resetting password: ${err.message}`);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/departments', {
        method: 'POST',
        body: JSON.stringify({ name: deptName, code: deptCode })
      });
      setIsAddDeptOpen(false);
      setDeptName(''); setDeptCode('');
      loadData();
    } catch (err: any) {
      alert(`Error creating department: ${err.message}`);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await fetchApi<{ fileName: string }>('/admin/backup', { method: 'POST' });
      alert(`Backup created successfully: ${res.fileName}`);
    } catch (err: any) {
      alert(`Backup error: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">OfficeLink Administrative Suite</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                LAN Storage Monitoring, Employee Directory Management & System Audit Control
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: Activity },
            { id: 'employees', label: 'Employee Management', icon: Users },
            { id: 'departments', label: 'Departments', icon: Building2 },
            { id: 'audit', label: 'Security Audit Logs', icon: History },
            { id: 'backups', label: 'Database & Backups', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Employees</span>
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">{stats.totalEmployees}</p>
                <p className="text-[10px] text-emerald-400 font-mono mt-1">🟢 {stats.onlineCount} Online Now</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Storage Used</span>
                  <HardDrive className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">{formatStorage(stats.totalStorageBytes)}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">{stats.totalFiles} Files Transferred</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Messages</span>
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">{stats.totalMessages}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">Across {stats.totalConversations} Chats</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">System Health</span>
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-2">100% Operational</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">Host IP: {stats.lanIp}</p>
              </div>
            </div>

            {/* Server Specifications */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white">OfficeLink Host Server Specs</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Node Runtime</span>
                  <span className="text-indigo-400 font-bold">{stats.nodeVersion}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Uptime</span>
                  <span className="text-white font-bold">{Math.floor(stats.uptimeSeconds / 60)} mins</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Host IP Binding</span>
                  <span className="text-emerald-400 font-bold">http://{stats.lanIp}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] uppercase block">Air-Gap Status</span>
                  <span className="text-cyan-400 font-bold">100% Offline LAN</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EMPLOYEE MANAGEMENT */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Employee Accounts ({users.length})</h3>
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {users.map((u) => {
                    const deptName = typeof u.departmentId === 'object' ? u.departmentId?.name : 'General';
                    return (
                      <tr key={u._id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-indigo-300 font-bold">{u.employeeId}</td>
                        <td className="p-3.5 font-semibold text-white">{u.name}</td>
                        <td className="p-3.5">{deptName}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setResetUserId(u._id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserActive(u._id, u.isActive)}
                            className={`p-1.5 rounded-lg ${
                              u.isActive ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                            title={u.isActive ? 'Disable Account' : 'Enable Account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Company Departments ({departments.length})</h3>
              <button
                onClick={() => setIsAddDeptOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
              >
                <Building2 className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments.map(d => (
                <div key={d._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{d.name}</h4>
                    <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-300 font-mono text-[10px] font-bold rounded">
                      {d.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{d.description || 'No description provided.'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Security & Action Audit Logs</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Resource</th>
                    <th className="p-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                  {auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3.5 font-bold text-indigo-300">{log.actorName || 'System'}</td>
                      <td className="p-3.5 font-bold text-emerald-400">{log.action}</td>
                      <td className="p-3.5 text-slate-400">{log.resourceType}</td>
                      <td className="p-3.5 text-slate-400">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: BACKUPS */}
        {activeTab === 'backups' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white">Database & File Storage Backups</h3>
            <p className="text-xs text-slate-400">
              Generate an instant JSON snapshot backup of users, departments, conversations, and file metadata into <code className="text-indigo-400 font-mono">./uploads/backups/</code>.
            </p>

            <button
              onClick={handleTriggerBackup}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Create System Snapshot Backup</span>
            </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Add New Employee Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP106"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Verma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. vikram"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter initial password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Reset Password</h3>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Add New Department</h3>
            <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
