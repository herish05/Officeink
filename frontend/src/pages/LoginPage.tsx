import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserCheck, Radio, ShieldCheck, ArrowRight, Server } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await fetchApi<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ employeeId, password })
      });

      login(data.token, data.user);
      navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check Employee ID & Password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (empId: string, pass: string) => {
    setEmployeeId(empId);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">OfficeLink</h1>
          <p className="text-xs text-indigo-300 font-medium">
            Internal Air-Gapped Communication & File Transfer
          </p>
        </div>

        {/* LAN Server Banner */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3 text-xs text-slate-300">
          <Server className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 font-mono">
            <span className="text-[10px] text-slate-500 uppercase block">Host Address</span>
            <span className="text-emerald-400 font-bold">http://192.168.0.10</span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
            LAN Active
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Employee ID</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. EMP102 or EMP001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to OfficeLink'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Test Accounts */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-center">
            Quick Fill Demo Employee Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fillQuickAccount('EMP001', 'Admin@123')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] transition"
            >
              <p className="font-bold text-indigo-300">EMP001 (Admin)</p>
              <p className="text-[10px] text-slate-500">System Admin</p>
            </button>
            <button
              onClick={() => fillQuickAccount('EMP102', 'Pass@123')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-[11px] transition"
            >
              <p className="font-bold text-slate-200">EMP102 (Rahul)</p>
              <p className="text-[10px] text-slate-500">Dev Engineer</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
