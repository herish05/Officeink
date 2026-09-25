import React, { useState, useRef } from 'react';
import { Paperclip, Mic, Send, Square, Loader2, FileUp } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useSocketStore } from '../store/socketStore';

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (content: string, attachments?: any[]) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ conversationId, onSendMessage }) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');

  const { socket } = useSocketStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  // Handle Typing Notification
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (socket) {
      socket.emit('typing:start', { conversationId });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing:stop', { conversationId });
      }, 2000);
    }
  };

  // Submit Text Message
  const handleSend = () => {
    if (!content.trim() && !isUploading) return;
    onSendMessage(content.trim());
    setContent('');
    if (socket) {
      socket.emit('typing:stop', { conversationId });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Chunked Upload for files of ANY size!
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(0);

    try {
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      let lastResult: any = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunkBlob);
        formData.append('fileId', fileId);
        formData.append('originalName', file.name);
        formData.append('mimeType', file.type || 'application/octet-stream');
        formData.append('totalChunks', String(totalChunks));
        formData.append('chunkIndex', String(i));
        formData.append('totalSize', String(file.size));
        formData.append('conversationId', conversationId);

        const token = localStorage.getItem('officelink_token');
        const res = await fetch('/api/files/upload-chunk', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || 'Chunk upload failed');

        lastResult = json.data;
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setUploadProgress(progress);
      }

      if (lastResult && lastResult.completed) {
        const fileType = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
          ? 'audio'
          : 'file';

        onSendMessage('', [
          {
            fileId: lastResult.fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            url: lastResult.url
          }
        ]);
      }
    } catch (err: any) {
      alert(`File Upload Error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // MediaRecorder API Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        // Upload recorded audio blob
        setIsUploading(true);
        setUploadFileName('Voice Note');
        const formData = new FormData();
        formData.append('chunk', audioFile);
        formData.append('fileId', `voice_${Date.now()}`);
        formData.append('originalName', audioFile.name);
        formData.append('mimeType', 'audio/webm');
        formData.append('totalChunks', '1');
        formData.append('chunkIndex', '0');
        formData.append('totalSize', String(audioFile.size));
        formData.append('conversationId', conversationId);

        const token = localStorage.getItem('officelink_token');
        const res = await fetch('/api/files/upload-chunk', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const json = await res.json();
        setIsUploading(false);

        if (json.success) {
          onSendMessage('', [
            {
              fileId: json.data.fileId,
              name: 'Voice Message',
              size: audioFile.size,
              mimeType: 'audio/webm',
              url: json.data.url
            }
          ]);
        }

        // stop tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone access is required for audio messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center space-x-3 text-xs">
          <FileUp className="w-4 h-4 text-indigo-400 animate-bounce" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between font-mono text-[11px] text-slate-300 mb-1">
              <span className="truncate">Uploading {uploadFileName}...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="bg-indigo-500 h-full transition-all duration-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recording State Overlay */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
            <span className="text-xs font-mono font-bold text-rose-400">
              Recording Audio: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Send Audio</span>
          </button>
        </div>
      ) : (
        <div className="flex items-end space-x-2">
          {/* File Picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition"
            title="Attach File or Media"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Voice Record */}
          <button
            type="button"
            onClick={startRecording}
            disabled={isUploading}
            className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
            title="Record Voice Message"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Message Text Input */}
          <div className="flex-1 bg-slate-950 border border-slate-800 focus-within:border-indigo-500 rounded-xl px-3 py-2 transition">
            <textarea
              rows={1}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or press Shift+Enter for new line..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-24"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || isUploading}
            className={`p-2.5 rounded-xl transition shadow flex items-center justify-center ${
              content.trim() && !isUploading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
