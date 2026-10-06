import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Layers,
  PhoneOff,
  Lock,
  Box,
  Eye,
  Send,
  Mic as MicIcon,
} from 'lucide-react';

export const CallMeeting: React.FC = () => {
  const navigate = useNavigate();

  // Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSharing, setIsSharing] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'people' | 'project'>('chat');

  // Input Message
  const [chatMessage, setChatMessage] = useState('');

  // Members in Call Data
  const participants = [
    { id: '1', name: 'Minh Anh', role: 'Homeowner', roleColor: 'bg-sky-50 text-sky-600', avatar: 'MA', isMuted: false },
    { id: '2', name: 'Nguyen Linh', role: 'Designer', roleColor: 'bg-blue-50 text-blue-600', avatar: 'NL', isMuted: false },
    { id: '3', name: 'Tran Nam', role: 'Staff', roleColor: 'bg-purple-50 text-purple-600', avatar: 'TN', isMuted: true },
  ];

  // Chat Messages Data
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'Nguyen Linh',
      avatar: 'NL',
      avatarBg: 'bg-blue-600',
      text: 'Here is v3 of the living room. Sofa is now 2.8 m.',
      hasFile: false,
    },
    {
      id: 'm2',
      sender: 'Minh Anh',
      avatar: 'MA',
      avatarBg: 'bg-emerald-600',
      text: 'Looks good! Can we see the kitchen next?',
      hasFile: false,
    },
    {
      id: 'm3',
      sender: 'Tran Nam',
      avatar: 'TN',
      avatarBg: 'bg-purple-600',
      text: 'I will prepare the contract right after this call.',
      hasFile: true,
      fileName: 'Living room - v3.pdf',
      fileAuthor: 'Nguyen Linh',
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        sender: 'Minh Anh',
        avatar: 'MA',
        avatarBg: 'bg-emerald-600',
        text: chatMessage,
        hasFile: false,
      },
    ]);
    setChatMessage('');
  };

  return (
    <div className="w-full h-screen bg-[#080d1a] text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 px-6 border-b border-slate-800/80 bg-[#0a1124] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xs text-white">
            <Box size={16} />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">
              Design consultation
            </h1>
            <p className="text-[10px] text-slate-400">
              Modern Townhouse · Thu Duc · v3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800/80 text-sky-400 border border-slate-700/50">
            <Lock size={12} />
            <span>Encrypted</span>
          </span>

          <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/40">
            12:34
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Recording</span>
          </span>
        </div>
      </header>

      {/* Main Body (2 Columns) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT VIEW: Main Screen & Controls */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-[#070b16]">
          {/* Shared Screen Preview Box */}
          <div className="flex-1 bg-[#0b1329] border border-slate-800/80 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden shadow-2xl">
            {/* Top Indicator */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs font-medium text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Nguyen Linh is sharing</span>
            </div>

            {/* 3D Model Center Graphic Placeholder */}
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl border border-slate-700/60 bg-slate-800/40 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                <Box size={32} />
              </div>
              <p className="text-xs font-medium text-slate-400">
                Shared screen · 3D view · Living room · v3
              </p>
            </div>

            {/* Bottom Overlay Info */}
            <div className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
              📌 Pin comments are visible to everyone
            </div>
          </div>

          {/* Bottom Video Grid Strip (3 Participants) */}
          <div className="h-32 grid grid-cols-3 gap-4 flex-shrink-0">
            {/* Minh Anh */}
            <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl relative flex items-center justify-center overflow-hidden">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                MA
              </div>
              <div className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-slate-300">
                Minh Anh (You) <span className="text-slate-500 font-normal">Homeowner</span>
              </div>
            </div>

            {/* Nguyen Linh (Active Speaker Highlight) */}
            <div className="bg-[#0b1329] border-2 border-sky-500/80 rounded-2xl relative flex items-center justify-center overflow-hidden shadow-lg shadow-sky-500/10">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                NL
              </div>
              <div className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-slate-300">
                Nguyen Linh <span className="text-slate-500 font-normal">Designer</span>
              </div>
            </div>

            {/* Tran Nam */}
            <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl relative flex items-center justify-center overflow-hidden">
              <div className="w-11 h-11 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                TN
              </div>
              <div className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-slate-300">
                Tran Nam <span className="text-slate-500 font-normal">Staff</span>
              </div>
            </div>
          </div>

          {/* Call Control Toolbar */}
          <div className="flex items-center justify-center gap-3 py-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-600/20 border-rose-500/50 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                !isVideoOn
                  ? 'bg-rose-600/20 border-rose-500/50 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setIsSharing(!isSharing)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSharing
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              <Monitor size={18} />
            </button>

            <button
              type="button"
              className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-200 hover:bg-slate-700/80 transition cursor-pointer"
            >
              <MessageSquare size={18} />
            </button>

            <button
              type="button"
              className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-200 hover:bg-slate-700/80 transition cursor-pointer"
            >
              <Layers size={18} />
            </button>

            {/* Leave Call Button */}
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer ml-2"
            >
              <PhoneOff size={16} />
              <span>Leave call</span>
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR PANEL */}
        <div className="w-80 border-l border-slate-800/80 bg-[#0a1124] flex flex-col justify-between flex-shrink-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-slate-800/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chat
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('people')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'people'
                    ? 'bg-slate-800/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                People
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('project')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'project'
                    ? 'bg-slate-800/90 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Project
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Section: IN THIS CALL */}
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  IN THIS CALL ({participants.length})
                </h3>

                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          {p.avatar}
                        </div>
                        <span className="text-xs font-bold text-slate-200">
                          {p.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.roleColor}`}>
                          {p.role}
                        </span>
                        <MicIcon size={12} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: CHAT MESSAGES */}
              <div className="pt-2 border-t border-slate-800/80">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  CHAT
                </h3>

                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full ${msg.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                          {msg.avatar}
                        </div>
                        <span className="text-xs font-bold text-slate-200">
                          {msg.sender}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 pl-7 leading-relaxed">
                        {msg.text}
                      </p>

                      {msg.hasFile && (
                        <div className="ml-7 mt-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs text-slate-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <Box size={14} className="text-blue-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-[11px] truncate">{msg.fileName}</p>
                              <p className="text-[10px] text-slate-400">Shared by {msg.fileAuthor}</p>
                            </div>
                          </div>
                          <button type="button" className="text-slate-400 hover:text-white p-1">
                            <Eye size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Chat Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 bg-[#0a1124]">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-2.5 text-slate-400 hover:text-blue-400 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CallMeeting;