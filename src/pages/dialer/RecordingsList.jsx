import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/inboxAiClient';
import { Loader2, Trash2, Search, X, ArrowUpDown, Mic, ChevronDown, ChevronUp, Download, Share2, CheckSquare, Square } from 'lucide-react';
import RecordingPlayer from './RecordingPlayer';
import TranscriptBlock from './TranscriptBlock';

const SORT_OPTIONS = [
  { id: 'date', label: 'Newest' },
  { id: 'duration', label: 'Longest' },
  { id: 'size', label: 'Largest' },
  { id: 'title', label: 'A-Z' },
];

export default function RecordingsList() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date');
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    api.getRecordings()
      .then(data => setRecordings(data?.recordings || []))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (rec) => {
    const url = api.streamRecording(rec.id);
    if (playingId === rec.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.crossOrigin = 'use-credentials';
      audio.onended = () => setPlayingId(null);
      audio.play().catch(() => {});
      audioRef.current = audio;
      setPlayingId(rec.id);
    }
  };

  const deleteRec = async (id, e) => {
    e?.stopPropagation();
    await api.deleteRecording(id).catch(() => {});
    setRecordings(prev => prev.filter(r => r.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    for (const id of ids) await deleteRec(id);
    setSelected(new Set());
    setSelectMode(false);
  };

  const downloadRec = (rec, e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = api.streamRecording(rec.id);
    a.download = `${rec.title || 'recording'}.webm`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareRec = async (rec, e) => {
    e.stopPropagation();
    const url = api.streamRecording(rec.id);
    if (navigator.share) {
      try { await navigator.share({ title: rec.title || 'Recording', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const fmtDur = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs/60), s = secs%60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };
  const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1048576) return (bytes/1048576).toFixed(1) + ' MB';
    return Math.round(bytes/1024) + ' KB';
  };
  const fmtTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.round(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.round(diff/3600000) + 'h ago';
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  };

  // Filter + sort
  const filtered = recordings
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (r.title||'').toLowerCase().includes(q) || (r.transcript||'').toLowerCase().includes(q) || (r.ai_summary||'').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'duration') return (b.duration || 0) - (a.duration || 0);
      if (sort === 'size') return (b.size || 0) - (a.size || 0);
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b.created_at) - new Date(a.created_at); // date (default)
    });

  // Stats
  const totalDuration = recordings.reduce((s, r) => s + (r.duration || 0), 0);
  const totalSize = recordings.reduce((s, r) => s + (r.size || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Mic className="w-4 h-4 text-[#60a5fa]" />
        <span className="text-sm font-medium text-white">Recordings</span>
        {recordings.length > 0 && (
          <>
            <span className="text-[10px] text-slate-600">{recordings.length} files</span>
            {totalDuration > 0 && <span className="text-[10px] text-slate-600">{fmtDur(Math.round(totalDuration))}</span>}
            {totalSize > 0 && <span className="text-[10px] text-slate-600">{fmtSize(totalSize)}</span>}
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {selectMode && selected.size > 0 && (
            <button onClick={bulkDelete}
              className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-all flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete {selected.size}
            </button>
          )}
          <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            className={`p-1.5 rounded-lg transition-all ${selectMode ? "bg-[#3b82f6]/20 text-[#60a5fa]" : "text-slate-600 hover:text-slate-400"}`}
            title="Select multiple">
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-all" title="Sort">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            {showSort && (
              <div className="absolute right-0 top-8 z-10 bg-[#1a1f35] border border-white/10 rounded-xl shadow-xl py-1 min-w-[120px]">
                {SORT_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => { setSort(s.id); setShowSort(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-all ${sort === s.id ? 'text-[#60a5fa] bg-[#3b82f6]/10' : 'text-slate-400 hover:bg-white/5'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or transcript..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-0.5 rounded hover:bg-white/10">
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Mic className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">{recordings.length === 0 ? 'No recordings' : 'No matches'}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.map(rec => {
          const isExpanded = expandedId === rec.id;
          const isPlaying = playingId === rec.id;
          const isSelected = selected.has(rec.id);
          return (
            <div key={rec.id} className={`border-b border-white/5 ${isSelected ? 'bg-[#3b82f6]/5' : ''}`}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/4 transition-all"
                onClick={() => selectMode ? toggleSelect(rec.id, { stopPropagation: () => {} }) : setExpandedId(isExpanded ? null : rec.id)}>

                {selectMode && (
                  <button onClick={(e) => toggleSelect(rec.id, e)} className="flex-shrink-0">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-[#60a5fa]" />
                      : <Square className="w-4 h-4 text-slate-600" />
                    }
                  </button>
                )}

                <RecordingPlayer
                  recordingId={rec.id}
                  isPlaying={isPlaying}
                  onToggle={() => toggle(rec)}
                  audioRef={audioRef}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{rec.title || 'Recording'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">{fmtTime(rec.created_at)}</span>
                    {rec.duration > 0 && <span className="text-[11px] text-slate-500">{fmtDur(rec.duration)}</span>}
                    {rec.size > 0 && <span className="text-[11px] text-slate-500">{fmtSize(rec.size)}</span>}
                    {rec.transcript && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-semibold">TXT</span>}
                    {rec.ai_summary && <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-semibold">AI</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => downloadRec(rec, e)}
                    className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-all" title="Download">
                    <Download className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  <button onClick={(e) => shareRec(rec, e)}
                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-all" title="Share / Copy link">
                    <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                  <button onClick={(e) => deleteRec(rec.id, e)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                  <div className="text-slate-600">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
              {isExpanded && (rec.ai_summary || rec.transcript) && (
                <div className="px-4 pb-4 space-y-2">
                  {rec.ai_summary && (
                    <div className="bg-purple-500/10 rounded-xl p-3">
                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wide mb-1.5">AI Summary</p>
                      <p className="text-xs text-purple-300 leading-relaxed whitespace-pre-line">{rec.ai_summary}</p>
                    </div>
                  )}
                  {rec.transcript && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Transcript</p>
                      <TranscriptBlock text={rec.transcript} maxHeight="160px" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
