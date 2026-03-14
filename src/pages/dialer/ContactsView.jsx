import { useState, useEffect } from 'react';
import { PhoneIcon } from './icons';

// ContactsView: simple contacts list placeholder
export default function ContactsView({ onCall, onMessage }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    import('@/api/inboxAiClient').then(m => {
      const a = m.api || m.default;
      if (a && a.getContacts) a.getContacts().then(cs => { const arr = Array.isArray(cs) ? cs : (cs?.contacts || []); setContacts(arr); }).catch(() => {});
    });
  }, []);

  const getInitialsLocal = (n) => {
    if (!n) return '?';
    return n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const q = search.toLowerCase().trim();
  const filtered = q ? contacts.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q) ||
    (c.company || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  ) : contacts;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0a0e1a' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2744' }}>
        <input
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: '#0f1628', border: '1px solid #1a2744',
            borderRadius: '10px', padding: '8px 12px', color: '#FFFFFF',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#6b84a8', fontSize: '14px' }}>
          {search ? 'No matching contacts' : 'No contacts found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map(c => (
            <div key={c.id || c.email} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderBottom: '1px solid #1a2744',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#3b82f6', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {getInitialsLocal(c.name || c.email)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.email}</div>
                {c.phone && <div style={{ color: '#6b84a8', fontSize: '12px' }}>{c.phone}</div>}
              </div>
              {c.phone && (
                <button onClick={() => onCall && onCall(c)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                  color: '#3b82f6',
                }}>
                  <PhoneIcon size={18} color="#3b82f6" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
