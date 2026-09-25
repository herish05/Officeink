import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react';
import { useSocketStore } from '../store/socketStore';
import { useChatStore } from '../store/chatStore';

export const CallModal: React.FC = () => {
  const { socket } = useSocketStore();
  const { callState, resetCallState } = useChatStore();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(callState.type === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const targetUserId = callState.targetUser?.id || callState.caller?.id;

  useEffect(() => {
    if (!socket || !targetUserId) return;

    // WebRTC PeerConnection configuration
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    // Capture Local Media
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callState.type === 'video'
    }).then(stream => {
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      if (!callState.isIncoming) {
        // Create Offer if Caller
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { targetUserId, sdp: offer });
        });
      }
    }).catch(err => {
      alert('Camera/Microphone access error: ' + err.message);
    });

    // Remote Stream Event
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidate Event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', { targetUserId, candidate: event.candidate });
      }
    };

    // Socket Signaling Listeners
    socket.on('webrtc:offer', async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      if (fromUserId === targetUserId) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { targetUserId: fromUserId, sdp: answer });
      }
    });

    socket.on('webrtc:answer', async ({ fromUserId, sdp }: { fromUserId: string; sdp: any }) => {
      if (fromUserId === targetUserId) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('webrtc:ice-candidate', async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      if (fromUserId === targetUserId && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (_) {}
      }
    });

    socket.on('call:ended', () => {
      handleEndCall();
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('call:ended');
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);

        screenTrack.onended = () => {
          if (sender && localStreamRef.current) {
            sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err: any) {
        console.error(err);
      }
    } else {
      if (localStreamRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
      }
      setIsScreenSharing(false);
    }
  };

  const handleEndCall = () => {
    if (socket && targetUserId) {
      socket.emit('call:end', { targetUserId, callId: callState.callId });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (pcRef.current) pcRef.current.close();
    resetCallState();
  };

  if (!callState.active || callState.isIncoming) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="text-base font-bold text-white">
              {callState.type === 'video' ? 'Video Call' : 'Audio Call'} with {callState.targetUser?.name || callState.caller?.name}
            </h2>
            <p className="text-xs text-emerald-400 font-mono">WebRTC Peer Connection Active</p>
          </div>
          <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/30">
            Encrypted LAN Stream
          </span>
        </div>

        {/* Video Grid */}
        <div className="flex-1 relative bg-slate-950 p-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-hidden">
          {/* Remote Video Stream */}
          <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-white">
              {callState.targetUser?.name || callState.caller?.name || 'Remote Peer'}
            </div>
          </div>

          {/* Local Video Stream */}
          <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-300">
              You (Local)
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-center space-x-4">
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-full shadow transition ${
              isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-full shadow transition ${
              isCameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
            title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-full shadow transition ${
              isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="Share Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
