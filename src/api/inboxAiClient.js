// Inbox AI API client — replaces base44
const BASE = import.meta.env.VITE_API_BASE || 'https://web-production-bb17f2.up.railway.app';

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  // ── Auth
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),

  // ── Phone
  getPhoneToken: () => request('GET', '/api/phone/token'),
  getPhoneMe: () => request('GET', '/api/phone/me'),
  warmTransfer: (call_control_id, destination) => request('POST', '/api/phone/warm-transfer', { call_control_id, destination }),
  supervisorListen: (call_control_id, mode) => request('POST', '/api/phone/supervisor/listen', { call_control_id, mode }),
  getCallerContext: (number) => request('GET', `/api/phone/context/${encodeURIComponent(number)}`),

  // ── Call Logs
  getCallLogs: (filter) => request('GET', `/api/call-logs${filter ? `?filter=${filter}` : ''}`),
  deleteCallLog: (id) => request('DELETE', `/api/call-logs/${id}`),

  // ── Voicemails
  getVoicemails: () => request('GET', '/api/voicemails'),
  markVoicemailRead: (id) => request('PATCH', `/api/voicemails/${id}/read`),
  getVoicemailAudio: (id) => `${BASE}/api/voicemails/${id}/audio`,

  // ── Contacts
  getContacts: () => request('GET', '/api/phone-contacts'),
  createContact: (data) => request('POST', '/api/phone-contacts', data),
  updateContact: (id, data) => request('PATCH', `/api/phone-contacts/${id}`, data),
  deleteContact: (id) => request('DELETE', `/api/phone-contacts/${id}`),

  // ── SMS
  getSmsThreads: () => request('GET', '/api/sms/threads'),
  getSmsThread: (number) => request('GET', `/api/sms/thread/${encodeURIComponent(number)}`),
  sendSms: (to, body) => request('POST', '/api/sms/send', { to, body }),
  markThreadRead: (number) => request('POST', `/api/sms/thread/${encodeURIComponent(number)}/read`),
  getSmsReplySuggestions: (threadNumber) => request('GET', `/api/sms/suggest-replies?number=${encodeURIComponent(threadNumber)}`),
  createSmsCampaign: (data) => request('POST', '/api/sms/campaign', data),
  getSmsCampaigns: () => request('GET', '/api/sms/campaigns'),

  // ── AI
  askAI: (prompt) => request('POST', '/api/ai/ask', { message: prompt }),
  getCallScore: (data) => request('POST', '/api/ai/call-score', data),
  getCallScores: () => request('GET', '/api/ai/call-scores'),
  getSentiment: (text) => request('POST', '/api/ai/sentiment', { text }),

  // ── Recordings
  getRecordings: () => request('GET', '/api/recordings'),
  streamRecording: (id) => `${BASE}/api/recordings/${id}/stream`,

  // ── Meetings
  getJaaSToken: () => request('GET', '/api/meetings/jaas-token'),
  getMeetings: () => request('GET', '/api/meetings'),
  createMeeting: (data) => request('POST', '/api/meetings', data),
  aiCall: (to, message, voice) => request('POST', '/api/phone/ai-call', { to, message, voice }),

  // ── Analytics
  getCallAnalytics: (range) => request('GET', `/api/analytics/calls?range=${range || '7d'}`),
  getAgentAnalytics: () => request('GET', '/api/analytics/agents'),

  // ── Presence
  getPresence: () => request('GET', '/api/presence'),
  setPresence: (status) => request('POST', '/api/presence', { status }),

  // ── Business Hours
  getBusinessHours: () => request('GET', '/api/business-hours'),
  setBusinessHours: (config) => request('POST', '/api/business-hours', config),

  // ── Channels
  getChannels: () => request('GET', '/api/channels'),
  createChannel: (data) => request('POST', '/api/channels', data),
  getChannelMessages: (id) => request('GET', `/api/channels/${id}/messages`),
  sendChannelMessage: (id, body) => request('POST', `/api/channels/${id}/messages`, { body }),

  // ── Hunt Groups
  getHuntGroups: () => request('GET', '/api/hunt-groups'),
  createHuntGroup: (data) => request('POST', '/api/hunt-groups', data),
  deleteHuntGroup: (id) => request('DELETE', `/api/hunt-groups/${id}`),

  // ── Wallboard
  getWallboard: () => request('GET', '/api/wallboard/status'),

  // ── IVR
  getIVRConfigs: () => request('GET', '/api/ivr'),
  createIVRConfig: (data) => request('POST', '/api/ivr', data),
  updateIVRConfig: (id, data) => request('PATCH', `/api/ivr/${id}`, data),

  // ── Admin
  getAdminUsers: () => request('GET', '/api/admin/users'),
  createAdminUser: (data) => request('POST', '/api/admin/users', data),
  deleteAdminUser: (id) => request('DELETE', `/api/admin/users/${id}`),

  // ── AI Receptionist
  getAIReceptionistConfig: () => request('GET', '/api/ai-receptionist/config'),
  setAIReceptionistConfig: (data) => request('POST', '/api/ai-receptionist/config', data),

  // ── Callbacks
  scheduleCallback: (data) => request('POST', '/api/callback/schedule', data),
  getScheduledCallbacks: () => request('GET', '/api/callback/scheduled'),
};

export default api;
