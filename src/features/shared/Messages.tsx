import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Video,
  Paperclip,
  Send,
  FileText,
  Download,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';
import { workspaceApi } from '@/services/workspaceApi';

export const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const currentUser = getCurrentUser();
  const workspace = useDemoWorkspace();
  const [selectedProjectId, setSelectedProjectId] = useState(params.get('projectId') ?? workspace.projects[0]?.id ?? '');
  const selectedProject = workspace.projects.find((project) => project.id === selectedProjectId) ?? workspace.projects[0];
  const members = [
    { name: selectedProject?.homeowner, role: 'Homeowner', color: 'bg-emerald-600' },
    { name: selectedProject?.designer, role: 'Designer', color: 'bg-blue-600' },
    { name: selectedProject?.staff, role: 'Staff', color: 'bg-purple-600' },
  ].filter((member) => member.name);

  const conversations = workspace.projects.filter((project) => workspace.messages.some((message) => message.projectId === project.id)).map((project) => {
    const latest = [...workspace.messages].filter((message) => message.projectId === project.id).at(-1);
    return { id: project.id, title: project.name, subtitle: latest ? `${latest.sender}: ${latest.text}` : 'No messages yet', time: latest?.sentAt ?? '', unread: 0, avatar: project.homeowner.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), avatarBg: 'bg-blue-600', active: project.id === selectedProject?.id };
  });
  const projectMessages = workspace.messages.filter((message) => message.projectId === selectedProject?.id).map((message) => ({
    ...message,
    time: message.sentAt,
    avatar: message.sender.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    avatarBg: message.senderRole === 'Homeowner' ? 'bg-emerald-600' : message.senderRole === 'Staff' ? 'bg-purple-600' : 'bg-blue-600',
    isMe: message.sender === (currentUser?.name ?? 'Guest'),
  }));
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !selectedProject) return;
    setSending(true);
    void workspaceApi.sendMessage(selectedProject.id, currentUser?.name ?? 'Demo user', currentUser?.role ?? 'Staff', text)
      .then(() => setInputMessage(''))
      .finally(() => setSending(false));
  };
  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role={currentUser?.role} />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* Title & Top Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Messages
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              One inbox for project chats, staff and partners. The same screen for every role.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus size={16} />
            <span>New message</span>
          </button>
        </div>

        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (3 cols): Conversations List */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-[680px] flex flex-col">
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {conversations.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedProjectId(chat.id)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-start gap-3 ${
                    chat.active
                      ? 'bg-blue-50/60 border border-blue-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full ${chat.avatarBg} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    {chat.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {chat.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">
                        {chat.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {chat.subtitle}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <span className="w-4 h-4 bg-blue-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      {chat.unread}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CỘT GIỮA (6 cols): Chat Window */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-[680px] flex flex-col justify-between">
            <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  NL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedProject?.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {[selectedProject?.designer, selectedProject?.staff, selectedProject?.homeowner].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/call-meeting')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Video size={14} />
                <span>Video call</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="flex justify-center my-2">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-0.5 rounded-full">
                  Today
                </span>
              </div>

              {projectMessages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                        {msg.text} · {msg.time}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.isMe ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {!msg.isMe && (
                      <div
                        className={`w-7 h-7 rounded-full ${msg.avatarBg} text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-1`}
                      >
                        {msg.avatar}
                      </div>
                    )}

                    <div className={`max-w-[75%] ${msg.isMe ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          {msg.sender}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {msg.time}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed inline-block text-left ${
                          msg.isMe
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {msg.hasFile && (
                          <div className="mt-2.5 p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-slate-800 shadow-sm">
                            <FileText size={20} className="text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{msg.fileName}</p>
                              <p className="text-[10px] text-slate-400">{msg.fileSize}</p>
                            </div>
                            <button
                              type="button"
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type a message..." disabled={sending}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <Paperclip size={16} />
                </button>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                <span>{sending ? 'Sending…' : 'Send'}</span>
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* CỘT PHẢI (3 cols): Project info & Shared Files & Members */}
          <div className="lg:col-span-3 space-y-5">
            {/* Box 1: Project Snapshot */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase pb-1 border-b border-slate-200">
                Project
              </h2>

              <div className="divide-y divide-slate-200 text-xs">
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-slate-500">Stage</span>
                  <span className="font-bold text-slate-900">{selectedProject?.stage}</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-slate-500">Version</span>
                  <span className="font-bold text-slate-900">v{selectedProject?.currentVersion}</span>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <span className="text-slate-500">Rounds</span>
                  <span className="font-bold text-slate-900">{selectedProject?.currentRound} / {selectedProject?.totalRounds}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Shared Files */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase pb-1 border-b border-slate-200">
                Shared files
              </h2>

              <div className="divide-y divide-slate-200 text-xs">
                {workspace.files.filter((file) => file.projectId === selectedProject?.id).map((file) => <div key={file.id} className="flex items-center gap-2 py-2.5 text-slate-700"><FileText size={14} className="shrink-0 text-slate-400"/><span className="truncate font-medium">{file.name}</span></div>)}
              </div>
            </div>

            {/* Box 3: Members */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase pb-1 border-b border-slate-200">
                Members
              </h2>

              <div className="divide-y divide-slate-200">
                {members.map((member) => (
                  <div key={member.role} className="flex items-center gap-2.5 py-2.5">
                    <div className={`w-7 h-7 rounded-full ${member.color} text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0`}>
                      {member.name!.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{member.name}</h4>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Messages;
