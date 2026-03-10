import { useState, useEffect } from 'react';
import { api } from '@/api/inboxAiClient';
import { Users, UserPlus, Trash2, Clock, Shield } from 'lucide-react';

const STATUS_COLORS = { available:'bg-green-500/20 text-green-400', busy:'bg-red-500/20 text-red-400', offline:'bg-gray-500/20 text-gray-400', dnd:'bg-orange-500/20 text-orange-400' };

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [businessHours, setBusinessHours] = useState({});
  const [saving, setSaving] = useState(false);

  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  useEffect(() => {
    api.getAdminUsers().then(setUsers).catch(console.error);
    api.getBusinessHours().then(bh => {
      if (!Object.keys(bh).length) {
        const d = {};
        DAYS.forEach(day => { d[day] = { enabled: ['monday','tuesday','wednesday','thursday','friday'].includes(day), open:'09:00', close:'17:00' }; });
        setBusinessHours(d);
      } else setBusinessHours(bh);
    }).catch(console.error);
  }, []);

  const createUser = async () => {
    if (!form.email || !form.name) return;
    setLoading(true);
    try {
      await api.createAdminUser(form);
      const us = await api.getAdminUsers();
      setUsers(us); setShowNew(false); setForm({ name:'', email:'', password:'' });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.deleteAdminUser(id);
    setUsers(u => u.filter(x => x.id !== id));
  };

  const saveHours = async () => {
    setSaving(true);
    await api.setBusinessHours(businessHours).catch(console.error);
    setSaving(false);
  };

  const updateDay = (day, k, v) => setBusinessHours(h => ({ ...h, [day]: { ...h[day], [k]: v } }));

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield size={20}/>Admin Panel</h2>

      {/* Users */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2"><Users size={16}/>Team Members ({users.length})</h3>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
            <UserPlus size={14}/>Add User
          </button>
        </div>

        {showNew && (
          <div className="bg-[#2a2a4a] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} placeholder="Full Name"
                className="bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
              <input value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} placeholder="Email"
                className="bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
            </div>
            <input value={form.password} onChange={e => setForm(f => ({...f,password:e.target.value}))} placeholder="Password (optional — defaults to TempPass123!)" type="password"
              className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 outline-none border border-[#3a3a5a] focus:border-blue-500"/>
            <div className="flex gap-2">
              <button onClick={createUser} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                {loading ? 'Creating…' : 'Create User'}
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 bg-[#1a1a2e] text-gray-400 text-sm py-2 rounded-lg hover:bg-[#3a3a5a]">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-[#2a2a4a] rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">{(u.name||u.email||'?')[0].toUpperCase()}</div>
                <div>
                  <div className="text-sm font-medium text-white">{u.name || u.email}</div>
                  <div className="text-xs text-gray-400">{u.email} {u.phone_number ? '· ' + u.phone_number : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[u.presence] || STATUS_COLORS.offline}`}>{u.presence || 'offline'}</span>
                <button onClick={() => deleteUser(u.id)} className="text-gray-500 hover:text-red-400 transition"><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-[#1e1e3a] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2"><Clock size={16}/>Business Hours</h3>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-400 capitalize">{day.slice(0,3)}</div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={businessHours[day]?.enabled||false}
                  onChange={e => updateDay(day,'enabled',e.target.checked)} className="sr-only peer"/>
                <div className="w-9 h-5 bg-gray-600 peer-checked:bg-blue-600 rounded-full transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"/>
              </label>
              {businessHours[day]?.enabled && <>
                <input type="time" value={businessHours[day]?.open||'09:00'}
                  onChange={e => updateDay(day,'open',e.target.value)}
                  className="bg-[#2a2a4a] text-white text-sm rounded-lg px-2 py-1 outline-none border border-[#3a3a5a]"/>
                <span className="text-gray-500 text-sm">to</span>
                <input type="time" value={businessHours[day]?.close||'17:00'}
                  onChange={e => updateDay(day,'close',e.target.value)}
                  className="bg-[#2a2a4a] text-white text-sm rounded-lg px-2 py-1 outline-none border border-[#3a3a5a]"/>
              </>}
            </div>
          ))}
        </div>
        <button onClick={saveHours} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
          {saving ? 'Saving…' : 'Save Business Hours'}
        </button>
      </div>
    </div>
  );
}
