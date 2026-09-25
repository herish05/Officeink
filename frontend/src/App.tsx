import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { CallModal } from './components/CallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { GroupsPage } from './pages/GroupsPage';
import { FilesPage } from './pages/FilesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import { useChatStore } from './store/chatStore';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { connectSocket, disconnectSocket, socket } = useSocketStore();
  const { setCallState } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  // Global socket listener for incoming calls
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: any) => {
      setCallState({
        active: true,
        isIncoming: true,
        callId: data.callId,
        type: data.type,
        caller: data.caller
      });
    };

    socket.on('call:incoming', handleIncomingCall);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
        Initializing OfficeLink Air-Gapped Session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden relative">
        <Outlet />
      </main>
      <CallModal />
      <IncomingCallModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/directory" element={<DirectoryPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
