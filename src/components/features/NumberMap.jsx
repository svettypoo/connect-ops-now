import { useState, useEffect, useRef, useCallback } from "react";
import { Link2, Unlink2, RotateCcw, Plus, X, Phone, User } from "lucide-react";
import api from "@/api/inboxAiClient";

const ROLE_COLORS = { primary: "#3b82f6", member: "#64748b", backup: "#f59e0b" };
const ROLE_LABELS = { primary: "Primary", member: "Member", backup: "Backup" };
const STORAGE_KEY = "numbermap-positions";

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatNumber(n) {
  if (!n) return "";
  if (n.length === 12 && n.startsWith("+1")) return `(${n.slice(2,5)}) ${n.slice(5,8)}-${n.slice(8)}`;
  return n;
}

export default function NumberMap() {
  const [data, setData] = useState({ users: [], numbers: [], assignments: [] });
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null); // { type: 'user', id }
  const [newNumber, setNewNumber] = useState("");
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [roleMenu, setRoleMenu] = useState(null); // assignment id
  const svgRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const load = useCallback(() => {
    api.getNumberMap()
      .then(d => {
        setData({
          users: Array.isArray(d?.users) ? d.users : [],
          numbers: Array.isArray(d?.numbers) ? d.numbers : [],
          assignments: Array.isArray(d?.assignments) ? d.assignments : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load saved positions
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Object.keys(saved).length) setPositions(saved);
    } catch {}
  }, []);

  // Save positions
  useEffect(() => {
    if (Object.keys(positions).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    }
  }, [positions]);

  // Auto-layout: persons left, numbers right
  const getPos = useCallback((key, defaultX, defaultY) => {
    return positions[key] || { x: defaultX, y: defaultY };
  }, [positions]);

  const userNodes = data.users.map((u, i) => ({
    key: `user-${u.id}`,
    type: "user",
    id: u.id,
    label: u.name || u.email,
    color: u.avatar_color || "#3b82f6",
    ...getPos(`user-${u.id}`, 120, 80 + i * 90),
  }));

  const numberNodes = data.numbers.map((n, i) => ({
    key: `num-${n}`,
    type: "number",
    number: n,
    label: formatNumber(n),
    ...getPos(`num-${n}`, 520, 80 + i * 90),
  }));

  // SVG dimensions
  const svgW = 700;
  const svgH = Math.max(400, Math.max(userNodes.length, numberNodes.length) * 90 + 100);

  // Drag handlers
  const onMouseDown = (e, key, nodeX, nodeY) => {
    if (linkMode) return; // link mode uses click instead
    e.preventDefault();
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    dragOffset.current = { x: svgP.x - nodeX, y: svgP.y - nodeY };
    setDragging(key);
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    setPositions(prev => ({
      ...prev,
      [dragging]: { x: svgP.x - dragOffset.current.x, y: svgP.y - dragOffset.current.y },
    }));
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    }
  }, [dragging, onMouseMove, onMouseUp]);

  // Link mode click
  const handleNodeClick = async (type, id) => {
    if (!linkMode) return;
    if (!linkFrom) {
      setLinkFrom({ type, id });
    } else {
      // Must be different types
      if (linkFrom.type === type) {
        setLinkFrom({ type, id }); // restart selection
        return;
      }
      const userId = type === "user" ? id : linkFrom.id;
      const phoneNumber = type === "number" ? id : linkFrom.id;
      try {
        await api.createAssignment({ user_id: userId, phone_number: phoneNumber, role: "member" });
        load();
      } catch (err) {
        console.error("Assignment failed:", err.message);
      }
      setLinkFrom(null);
      setLinkMode(false);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (id) => {
    try {
      await api.deleteAssignment(id);
      setRoleMenu(null);
      load();
    } catch {}
  };

  // Change role
  const handleChangeRole = async (assignmentId, role) => {
    try {
      await api.updateAssignment(assignmentId, { role });
      setRoleMenu(null);
      load();
    } catch {}
  };

  // Add number to assignments
  const handleAddNumber = async () => {
    const num = newNumber.trim();
    if (!num) return;
    // Just add it to the numbers list by creating a placeholder assignment if a user exists
    setData(prev => ({
      ...prev,
      numbers: prev.numbers.includes(num) ? prev.numbers : [...prev.numbers, num],
    }));
    setNewNumber("");
    setShowAddNumber(false);
  };

  // Reset layout
  const resetLayout = () => {
    setPositions({});
    localStorage.removeItem(STORAGE_KEY);
  };

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">Loading number map...</div>;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}
          className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all " +
            (linkMode ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-slate-400 hover:text-white border border-white/10")}>
          <Link2 className="w-3.5 h-3.5" />
          {linkMode ? (linkFrom ? "Now click a " + (linkFrom.type === "user" ? "number" : "person") : "Click a person or number") : "Link Mode"}
        </button>
        <button onClick={() => setShowAddNumber(!showAddNumber)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/10">
          <Plus className="w-3.5 h-3.5" /> Add Number
        </button>
        <button onClick={resetLayout}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/10">
          <RotateCcw className="w-3.5 h-3.5" /> Reset Layout
        </button>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/10">
          Refresh
        </button>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(ROLE_COLORS).map(([role, color]) => (
            <div key={role} className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-slate-500 capitalize">{role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Number Input */}
      {showAddNumber && (
        <div className="flex gap-2 items-center bg-white/5 border border-white/10 rounded-xl p-3">
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="+1XXXXXXXXXX"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]/50"
          />
          <button onClick={handleAddNumber} className="px-3 py-2 bg-[#3b82f6] hover:bg-[#60a5fa] rounded-lg text-xs font-semibold transition-all">Add</button>
          <button onClick={() => setShowAddNumber(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden relative" style={{ minHeight: svgH }}>
        {data.users.length === 0 && data.numbers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <User className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">No users or numbers to display</p>
            <p className="text-xs text-slate-600 mt-1">Assign phone lines in the Phone Numbers tab first</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full"
            style={{ height: svgH, cursor: dragging ? "grabbing" : "default" }}
          >
            {/* Connection lines */}
            {data.assignments.map(a => {
              const uNode = userNodes.find(u => u.id === a.user_id);
              const nNode = numberNodes.find(n => n.number === a.phone_number);
              if (!uNode || !nNode) return null;
              const color = ROLE_COLORS[a.role] || ROLE_COLORS.member;
              const isHovered = hoveredLink === a.id;
              const midX = (uNode.x + nNode.x) / 2;
              return (
                <g key={`link-${a.id}`}>
                  {/* Wider invisible hit area */}
                  <path
                    d={`M ${uNode.x + 30} ${uNode.y} C ${midX} ${uNode.y}, ${midX} ${nNode.y}, ${nNode.x - 70} ${nNode.y}`}
                    fill="none" stroke="transparent" strokeWidth={16}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredLink(a.id)}
                    onMouseLeave={() => setHoveredLink(null)}
                    onClick={() => setRoleMenu(roleMenu === a.id ? null : a.id)}
                  />
                  <path
                    d={`M ${uNode.x + 30} ${uNode.y} C ${midX} ${uNode.y}, ${midX} ${nNode.y}, ${nNode.x - 70} ${nNode.y}`}
                    fill="none" stroke={color} strokeWidth={isHovered ? 3 : 2}
                    strokeDasharray={a.role === "backup" ? "6,4" : "none"}
                    opacity={isHovered ? 1 : 0.6}
                    style={{ transition: "all 0.15s", pointerEvents: "none" }}
                  />
                  {/* Role label on line */}
                  <text x={midX} y={((uNode.y + nNode.y) / 2) - 8}
                    fill={color} fontSize={9} textAnchor="middle" opacity={isHovered ? 1 : 0}
                    style={{ transition: "opacity 0.15s", pointerEvents: "none" }}>
                    {ROLE_LABELS[a.role] || a.role}
                  </text>
                </g>
              );
            })}

            {/* Person nodes */}
            {userNodes.map(u => {
              const isLinkSelected = linkFrom?.type === "user" && linkFrom.id === u.id;
              return (
                <g key={u.key}
                  onMouseDown={e => onMouseDown(e, u.key, u.x, u.y)}
                  onClick={() => handleNodeClick("user", u.id)}
                  style={{ cursor: linkMode ? "pointer" : "grab" }}>
                  {/* Glow for selected in link mode */}
                  {isLinkSelected && (
                    <circle cx={u.x} cy={u.y} r={34} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6}>
                      <animate attributeName="r" values="34;38;34" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={u.x} cy={u.y} r={28} fill={u.color + "33"} stroke={u.color} strokeWidth={2} />
                  <text x={u.x} y={u.y + 1} fill="white" fontSize={13} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                    {initials(u.label)}
                  </text>
                  <text x={u.x} y={u.y + 42} fill="#94a3b8" fontSize={11} textAnchor="middle">
                    {u.label?.length > 16 ? u.label.slice(0, 14) + "..." : u.label}
                  </text>
                </g>
              );
            })}

            {/* Phone number nodes */}
            {numberNodes.map(n => {
              const isLinkSelected = linkFrom?.type === "number" && linkFrom.id === n.number;
              const w = 140, h = 36;
              return (
                <g key={n.key}
                  onMouseDown={e => onMouseDown(e, n.key, n.x, n.y)}
                  onClick={() => handleNodeClick("number", n.number)}
                  style={{ cursor: linkMode ? "pointer" : "grab" }}>
                  {isLinkSelected && (
                    <rect x={n.x - w/2 - 4} y={n.y - h/2 - 4} width={w + 8} height={h + 8} rx={12}
                      fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6}>
                      <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
                    </rect>
                  )}
                  <rect x={n.x - w/2} y={n.y - h/2} width={w} height={h} rx={10}
                    fill="rgba(96,165,250,0.1)" stroke="#3b82f6" strokeWidth={1.5} />
                  <text x={n.x + 10} y={n.y + 1} fill="#60a5fa" fontSize={12} fontWeight="600"
                    textAnchor="middle" dominantBaseline="central" fontFamily="monospace">
                    {n.label}
                  </text>
                  {/* Phone icon */}
                  <circle cx={n.x - w/2 + 16} cy={n.y} r={10} fill="rgba(96,165,250,0.15)" />
                  <text x={n.x - w/2 + 16} y={n.y + 1} fill="#60a5fa" fontSize={10} textAnchor="middle" dominantBaseline="central">
                    T
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Role context menu (positioned absolute over SVG) */}
        {roleMenu && (() => {
          const a = data.assignments.find(x => x.id === roleMenu);
          if (!a) return null;
          const uNode = userNodes.find(u => u.id === a.user_id);
          const nNode = numberNodes.find(n => n.number === a.phone_number);
          if (!uNode || !nNode) return null;
          const mx = (uNode.x + nNode.x) / 2;
          const my = (uNode.y + nNode.y) / 2;
          // Convert SVG coords to percentage for absolute positioning
          const leftPct = (mx / svgW) * 100;
          const topPct = (my / svgH) * 100;
          return (
            <div className="absolute bg-[#1e293b] border border-white/20 rounded-xl shadow-xl p-2 space-y-1 z-20"
              style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%, -50%)", minWidth: 140 }}>
              <p className="text-[10px] text-slate-500 px-2 pt-1 uppercase tracking-wider">Set Role</p>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <button key={role} onClick={() => handleChangeRole(a.id, role)}
                  className={"w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all " +
                    (a.role === role ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                  <div className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[role] }} />
                  {label}
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1">
                <button onClick={() => handleDeleteAssignment(a.id)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-all">
                  <Unlink2 className="w-3 h-3" /> Remove Link
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{data.users.length} user{data.users.length !== 1 ? "s" : ""}</span>
        <span>{data.numbers.length} number{data.numbers.length !== 1 ? "s" : ""}</span>
        <span>{data.assignments.length} assignment{data.assignments.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
