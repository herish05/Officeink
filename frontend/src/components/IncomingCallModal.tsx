import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useSocketStore } from '../store/socketStore';

export const IncomingCallModal: React.FC = () => {
  const { callState, setCallState, resetCallState } = useChatStore();
  const { socket } = useSocketStore();

  if (!callState.isIncoming || !callState.caller) return null;

  const handleAccept = () => {
    if (socket && callState.caller) {
      socket.emit('call:accept', { callerId: callState.caller.id, callId: callState.callId });
    }
    setCallState({ isIncoming: false, active: true, targetUser: callState.caller });
  };

  const handleDecline = () => {
    if (socket && callState.caller) {
      socket.emit('call:reject', { callerId: callState.caller.id, callId: callState.callId, reason: 'Declined' });
    }
    resetCallState();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-pulse">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto shadow-lg shadow-indigo-500/30 mb-4">
          {callState.caller.name.charAt(0).toUpperCase()}
        </div>

        <h3 className="text-lg font-bold text-white">{callState.caller.name}</h3>
        <p className="text-xs text-indigo-400 font-mono mt-1">
          Incoming {callState.type === 'video' ? 'Video' : 'Audio'} Call...
        </p>

        <div className="flex items-center justify-center space-x-6 mt-6">
          <button
            onClick={handleDecline}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center"
            title="Decline"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            onClick={handleAccept}
            className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center justify-center animate-bounce"
            title="Accept"
          >
            {callState.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
