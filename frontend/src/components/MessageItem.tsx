import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Play, Pause, Check, CheckCheck, FileCode, Archive } from 'lucide-react';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  isSelf: boolean;
  onPreviewImage: (url: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isSelf, onPreviewImage }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePlayAudio = (url: string) => {
    if (isPlayingAudio && audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
      return;
    }

    const audio = new Audio(url);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
    setAudioElement(audio);
    setIsPlayingAudio(true);
  };

  const senderName = typeof message.senderId === 'object' ? message.senderId.name : 'Employee';
  const senderId = typeof message.senderId === 'object' ? message.senderId.employeeId : '';

  return (
    <div className={`flex flex-col my-1.5 ${isSelf ? 'items-end' : 'items-start'}`}>
      <div className="flex items-end space-x-2 max-w-[75%]">
        {!isSelf && (
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0 mb-1">
            {senderName.charAt(0).toUpperCase()}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-md transition-all ${
            isSelf
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none'
              : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none'
          }`}
        >
          {/* Sender Header for Group Chats */}
          {!isSelf && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[11px] font-bold text-indigo-300">{senderName}</span>
              <span className="text-[9px] font-mono text-slate-400">{senderId}</span>
            </div>
          )}

          {/* Text Message */}
          {message.content && (
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((att, idx) => {
                const fileId = typeof att.fileId === 'object' ? att.fileId?._id : att.fileId;
                const fileUrl = att.url || `/api/files/${fileId}/download`;
                const previewUrl = `/api/files/${fileId}/preview`;
                const isImage = att.mimeType?.startsWith('image/');
                const isVideo = att.mimeType?.startsWith('video/');
                const isAudio = att.mimeType?.startsWith('audio/');

                // Image Preview Card
                if (isImage) {
                  return (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950/40">
                      <img
                        src={previewUrl}
                        alt={att.name}
                        onClick={() => onPreviewImage(previewUrl)}
                        className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition"
                      />
                      <div className="p-2 flex items-center justify-between bg-slate-900/80 text-[10px]">
                        <span className="truncate max-w-[180px] text-slate-300 font-mono">{att.name}</span>
                        <a
                          href={fileUrl}
                          download={att.name}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>{formatFileSize(att.size)}</span>
                        </a>
                      </div>
                    </div>
                  );
                }

                // Video Preview Player
                if (isVideo) {
                  return (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                      <video controls className="max-h-60 w-full rounded">
                        <source src={previewUrl} type={att.mimeType} />
                        Your browser does not support HTML5 video.
                      </video>
                      <div className="p-1.5 flex items-center justify-between text-[10px] text-slate-300">
                        <span className="truncate">{att.name}</span>
                        <span>{formatFileSize(att.size)}</span>
                      </div>
                    </div>
                  );
                }

                // Voice Message Player
                if (isAudio) {
                  return (
                    <div key={idx} className="flex items-center space-x-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-700/60 min-w-[200px]">
                      <button
                        onClick={() => handlePlayAudio(previewUrl)}
                        className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      {/* Waveform Visualizer simulation */}
                      <div className="flex-1 flex items-center space-x-1 h-5">
                        {[40, 70, 30, 90, 50, 80, 40, 60, 100, 40, 70, 30].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${isPlayingAudio ? h : 30}%` }}
                            className={`w-1 rounded-full transition-all ${
                              isPlayingAudio ? 'bg-indigo-400 wave-bar' : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>

                      <span className="text-[10px] font-mono text-slate-300">{formatFileSize(att.size)}</span>
                    </div>
                  );
                }

                // Generic File Attachment Card
                return (
                  <div key={idx} className="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-xl border border-slate-700/70 hover:border-indigo-500/50 transition">
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                        {att.name.split('.').pop()?.substring(0, 3) || 'FILE'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-200 truncate">{att.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{formatFileSize(att.size)}</p>
                      </div>
                    </div>
                    <a
                      href={fileUrl}
                      download={att.name}
                      className="ml-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow flex items-center space-x-1 text-xs font-semibold"
                      title="Download File from LAN"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Timestamp & Read Receipts */}
          <div className={`flex items-center space-x-1 mt-1 text-[9px] font-mono ${isSelf ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isSelf && (
              message.status === 'read' ? (
                <CheckCheck className="w-3 h-3 text-cyan-300" />
              ) : (
                <Check className="w-3 h-3 text-indigo-300" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
