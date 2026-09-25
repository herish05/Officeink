import React, { useEffect, useState } from 'react';
import { Files, Download, FileText, Image as ImageIcon, Video, Music, Archive, Search, FileCode } from 'lucide-react';
import { fetchApi } from '../services/api';
import { Message } from '../types';

export const FilesPage: React.FC = () => {
  const [fileMessages, setFileMessages] = useState<Message[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Collect all messages with attachments from conversations
    fetchApi<any[]>('/conversations').then(async (convs) => {
      const allMsgs: Message[] = [];
      for (const c of convs) {
        try {
          const res = await fetchApi<{ messages: Message[] }>(`/conversations/${c._id}/messages`);
          const msgWithAtt = res.messages.filter(m => m.attachments && m.attachments.length > 0);
          allMsgs.push(...msgWithAtt);
        } catch (_) {}
      }
      setFileMessages(allMsgs);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const allAttachments = fileMessages.flatMap(m =>
    (m.attachments || []).map(att => ({
      ...att,
      messageId: m._id,
      conversationId: m.conversationId,
      senderName: typeof m.senderId === 'object' ? m.senderId.name : 'Staff',
      createdAt: m.createdAt
    }))
  );

  const filteredAttachments = allAttachments.filter(att => {
    if (filterType === 'image' && !att.mimeType.startsWith('image/')) return false;
    if (filterType === 'video' && !att.mimeType.startsWith('video/')) return false;
    if (filterType === 'audio' && !att.mimeType.startsWith('audio/')) return false;
    if (filterType === 'document' && (att.mimeType.startsWith('image/') || att.mimeType.startsWith('video/') || att.mimeType.startsWith('audio/'))) return false;

    if (search) {
      return att.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Shared File Repository</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure Central Storage for LAN Transferred Documents, Media, Archives & Source Code
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-semibold">
            {allAttachments.length} Files Transferred
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search shared files by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {['all', 'document', 'image', 'video', 'audio'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                  filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Files Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs">Loading shared files...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttachments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                No files found in shared repository.
              </div>
            ) : (
              filteredAttachments.map((file, idx) => {
                const fileId = typeof file.fileId === 'object' ? (file.fileId as any)?._id : file.fileId;
                const downloadUrl = file.url || `/api/files/${fileId}/download`;

                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between hover:border-indigo-500/50 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase font-mono">
                        {file.name.split('.').pop()?.substring(0, 3) || 'FILE'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{file.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatFileSize(file.size)} • Sent by {file.senderName}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <a
                      href={downloadUrl}
                      download={file.name}
                      className="ml-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition flex items-center space-x-1 text-xs font-semibold"
                      title="Download File from LAN Server"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
