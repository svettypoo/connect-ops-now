// Inbox AI API client — replaces base44
// Backend: https://web-production-bb17f2.up.railway.app

const BASE = import.meta.env.VITE_API_BASE || 'https://web-production-bb17f2.up.railway.app';

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),

  // ── Phone / WebRTC ──────────────────────────────────────────────────────────
  getPhoneToken: () => request('GET', '/api/phone/token'),
  getPhoneMe: () => request('GET', '/api/phone/me'),

  // ── Call Logs ───────────────────────────────────────────────────────────────
  getCallLogs: (filter) => request('GET', `/api/call-logs${filter ? `?filter=${filter}` : ''}`),
  deleteCallLog: (id) => request('DELETE', `/api/call-logs/${id}`),

  // ── Voicemails ──────────────────────────────────────────────────────────────
  getVoicemails: () => request('GET', '/api/voicemails'),
  markVoicemailRead: (id) => request('PATCH', `/api/voicemails/${id}/read`),
  getVoicemailAudio: (id) => `${BASE}/api/voicemails/${id}/audio`,

  // ── Contacts ─────────────────────────────────────────────────────────────────
  getContacts: () => request('GET', '/api/phone-contacts'),
  createContact: (data) => request('POST', '/api/phone-contacts', data),
  updateContact: (id, data) => request('PATCH', `/api/phone-contacts/${id}`, data),
  deleteContact: (id) => request('DELETE', `/api/phone-contacts/${id}`),

  // ── SMS ───────────────────────────────────────────────────────────────────────
  getSmsThreads: () => request('GET', '/api/sms/threads'),
  getSmsThread: (number) => request('GET', `/api/sms/thread/${encodeURIComponent(number)}`),
  sendSms: (to, body) => request('POST', '/api/sms/send', { to, body }),
  markThreadRead: (number) => request('POST', `/api/sms/thread/${encodeURIComponent(number)}/read`),
  getSmsReplySuggestions: (threadNumber) => request('GET', `/api/sms/suggest-replies?number=${encodeURIComponent(threadNumber)}`),

  // ── AI ────────────────────────────────────────────────────────────────────────
  askAI: (prompt) => request('POST', '/api/ai/ask', { message: prompt }),
  translateText: (text) => request('POST', '/api/ai/ask', {
    message: `Detect the language of this text and translate it to English if not already English. Reply with JSON only: {"detected_language":"...","translated_text":"..."}\n\nText: ${text}`
  }),

  // ── Recordings ────────────────────────────────────────────────────────────────
  getRecordings: () => request('GET', '/api/recordings'),
  streamRecording: (id) => `${BASE}/api/recordings/${id}/stream`,

  // ── Meetings (Jitsi) ─────────────────────────────────────────────────────────
  getJaaSToken: () => request('GET', '/api/meetings/jaas-token'),
  getMeetings: () => request('GET', '/api/meetings'),
  createMeeting: (data) => request('POST', '/api/meetings', data),

  // ── Outbound AI Call ─────────────────────────────────────────────────────────
  aiCall: (to, message, voice) => request('POST', '/api/phone/ai-call', { to, message, voice }),
  callStatus: (id) => request('GET', `/api/phone/call-status/${id}`),
};

export default api;
