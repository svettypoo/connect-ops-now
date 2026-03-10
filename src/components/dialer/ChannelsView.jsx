import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/inboxAiClient';
import { Hash, Plus, Send, Users } from 'lucide-react';

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts), n = new Date();
  const diff = Math.round((n - d) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return diff + 'm ago';
  if (diff < 1440) return Math.round(diff/60) + 'h ago';
  return d.toLocaleDateString();
}

export default function ChannelsView() {
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.getChannels().then(chs => { setChannels(chs); if (chs.length) setActiveId(chs[0].id); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const load = () => api.getChannelMessages(activeId).then(setMessages).catch(() => {});
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !activeId) return;
    const t = text.trim(); setText('');
    await api.sendChannelMessage(activeId, t);
    const msgs = await api.getChannelMessages(activeId);
    setMessages(msgs);
  };

  const createChannel = async () => {
    if (!newName.trim()) return;
    const ch = await api.createChannel({ name: newName.trim(), type: 'public' });
    const chs = await api.getChannels();
    setChannels(chs); setActiveId(ch.id); setShowNew(false); setNewName('');
  };

  const active = channels.find(c => c.id === activeId);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 bg-[#151528] border-r border-[#1e1e3a] flex flex-col">
        <div className="p-3 border-b border-[#1e1e3a] flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
          <button onClick={() => setShowNew(true)} className="text-gray-400 hover:text-white transition"><Plus size={15}/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveId(ch.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${activeId===ch.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-[#1e1e3a] hover:text-white'}`}>
              <Hash size={13} className="shrink-0"/>
              <span className="truncate">{ch.name}</span>
              {ch.unread > 0 && <span className="ml-auto bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{ch.unread}</span>}
            </button>
          ))}
        </div>
        {showNew && (
          <div className="p-3 border-t border-[#1e1e3a] space-y-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="channel-name" onKeyDown={e => e.key==='Enter' && createChannel()}
              className="w-full bg-[#1e1e3a] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#2a2a4a] focus:border-blue-500"/>
            <div className="flex gap-2">
              <button onClick={createChannel} className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700">Create</button>
              <button onClick={() => setShowNew(false)} className="flex-1 bg-[#2a2a4a] text-gray-400 text-xs py-1.5 rounded-lg hover:bg-[#3a3a5a]">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {active && (
          <div className="px-4 py-3 border-b border-[#1e1e3a] flex items-center gap-2">
            <Hash size={16} className="text-gray-400"/>
            <span className="font-semibold text-white">{active.name}</span>
            <Users size={13} className="text-gray-500 ml-2"/>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hello!</p>}
          {messages.map(m => (
            <div key={m.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(m.sender_name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-white">{m.sender_name || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{timeAgo(m.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">{m.body}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        <div className="p-3 border-t border-[#1e1e3a]">
          <div className="flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key==='Enter' && send()}
              placeholder={`Message #${active?.name||'channel'}`}
              className="flex-1 bg-[#1e1e3a] text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-[#2a2a4a] focus:border-blue-500 placeholder-gray-500"/>
            <button onClick={send} disabled={!text.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
