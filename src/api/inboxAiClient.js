// Inbox AI API client
// On web (same-origin), always use '' so requests hit the same host.
// Only use VITE_API_BASE in Capacitor/APK builds (no window.location.host match).
const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
const BASE = isCapacitor ? (import.meta.env.VITE_API_BASE || 'https://phone.stproperties.com') : '';

// Session token storage for Capacitor (cross-origin cookies don't work in WebView)
function getSessionToken() { try { return localStorage.getItem('con_session_token'); } catch { return null; } }
function setSessionToken(token) { try { if (token) localStorage.setItem('con_session_token', token); } catch {} }
function clearSessionToken() { try { localStorage.removeItem('con_session_token'); } catch {} }

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  // In Capacitor, send session token via header since cookies are cross-origin
  if (isCapacitor) {
    const token = getSessionToken();
    if (token) opts.headers['x-session'] = token;
  }
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  // Store session token from login response (for Capacitor)
  if (typeof data === 'object' && data?.session && path === '/api/auth/login') {
    setSessionToken(data.session);
  }
  return data;
}

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => { clearSessionToken(); return request('POST', '/api/auth/logout'); },
  me: () => request('GET', '/api/auth/me'),
  getSipConfig: () => request('GET', '/api/phone/sip-config'),
  getPhoneMe: () => request('GET', '/api/phone/me'),
  getCallLogs: (filter) => request('GET', '/api/call-logs' + (filter ? '?filter=' + filter : '')),
  createCallLog: (data) => request('POST', '/api/call-logs', data),
  deleteCallLog: (id) => request('DELETE', '/api/call-logs/' + id),
  getVoicemails: () => request('GET', '/api/voicemails'),
  markVoicemailRead: (id) => request('PATCH', '/api/voicemails/' + id + '/read'),
  getVoicemailAudio: (id) => BASE + '/api/voicemails/' + id + '/audio',
  getContacts: () => request('GET', '/api/phone-contacts'),
  createContact: (data) => request('POST', '/api/phone-contacts', data),
  updateContact: (id, data) => request('PATCH', '/api/phone-contacts/' + id, data),
  deleteContact: (id) => request('DELETE', '/api/phone-contacts/' + id),
  getSmsThreads: () => request('GET', '/api/sms/threads'),
  getSmsThread: (number) => request('GET', '/api/sms/thread/' + encodeURIComponent(number)),
  sendSms: (to, body) => request('POST', '/api/sms/send', { to, body }),
  markThreadRead: (number) => request('POST', '/api/sms/thread/' + encodeURIComponent(number) + '/read'),
  getSmsReplySuggestions: (n) => request('GET', '/api/sms/suggest-replies?number=' + encodeURIComponent(n)),
  askAI: (prompt) => request('POST', '/api/ai/ask', { message: prompt }),
  translateText: (text) => request('POST', '/api/ai/ask', { message: 'Translate to English. Reply JSON only: {"detected_language":"...","translated_text":"..."}\n\n' + text }),
  getRecordings: () => request('GET', '/api/recordings'),
  streamRecording: (id) => BASE + '/api/recordings/' + id + '/stream',
  getJaaSToken: () => request('GET', '/api/meetings/jaas-token'),
  getMeetings: () => request('GET', '/api/meetings'),
  createMeeting: (data) => request('POST', '/api/meetings', data),
  aiCall: (to, message, voice) => request('POST', '/api/phone/ai-call', { to, message, voice }),
  callStatus: (id) => request('GET', '/api/phone/call-status/' + id),
  getPresence: () => request('GET', '/api/presence'),
  setPresence: (status) => request('POST', '/api/presence', { status }),
  getBusinessHours: () => request('GET', '/api/business-hours'),
  setBusinessHours: (data) => request('POST', '/api/business-hours', data),
  getAnalytics: (range) => request('GET', '/api/analytics/calls?range=' + (range || '7d')),
  getAgentAnalytics: () => request('GET', '/api/analytics/agents'),
  getChannels: () => request('GET', '/api/channels'),
  createChannel: (data) => request('POST', '/api/channels', data),
  getChannelMessages: (id) => request('GET', '/api/channels/' + id + '/messages'),
  sendChannelMessage: (id, body) => request('POST', '/api/channels/' + id + '/messages', { body }),
  getHuntGroups: () => request('GET', '/api/hunt-groups'),
  saveHuntGroup: (data) => request('POST', '/api/hunt-groups', data),
  getWallboard: () => request('GET', '/api/wallboard/status'),
  getIVRs: () => request('GET', '/api/ivr'),
  saveIVR: (data) => request('POST', '/api/ivr', data),
  warmTransfer: (id, dest) => request('POST', '/api/phone/warm-transfer', { call_control_id: id, destination: dest }),
  supervisorListen: (id) => request('POST', '/api/phone/supervisor/listen', { call_control_id: id }),
  scoreCall: (id, transcript) => request('POST', '/api/ai/call-score', { call_control_id: id, transcript }),
  analyzeSentiment: (text) => request('POST', '/api/ai/sentiment', { text }),
  sendSmsCampaign: (ids, prompt, preview) => request('POST', '/api/sms/campaign', { contact_ids: ids, prompt, preview }),
  scheduleCallback: (number, name, slots) => request('POST', '/api/callback/schedule', { number, name, slots }),
  getConversationContext: (number) => request('GET', '/api/phone/context/' + encodeURIComponent(number)),
  getAdminUsers: () => request('GET', '/api/admin/users'),
  inviteUser: (email, name) => request('POST', '/api/admin/users', { email, name }),
  getScheduledCallbacks: () => request('GET', '/api/callback/scheduled'),
  getDMUsers: () => request('GET', '/api/dm/users'),
  getDMMessages: (userId) => request('GET', '/api/dm/' + userId + '/messages'),
  sendDM: (userId, body, attachment_url) => request('POST', '/api/dm/' + userId + '/messages', { body, attachment_url }),
  registerPushToken: (data) => request('POST', '/api/push/register', data),
  parkCall: (call_control_id) => request('POST', '/api/phone/park', { call_control_id }),
  unparkCall: (call_control_id) => request('POST', '/api/phone/unpark', { call_control_id }),
  startRecording: (call_control_id) => request('POST', '/api/phone/recording/start', { call_control_id }),
  stopRecording: (call_control_id) => request('POST', '/api/phone/recording/stop', { call_control_id }),
  sendChannelMessageWithAttachment: (id, body, attachment_url) => request('POST', '/api/channels/' + id + '/messages', { body, attachment_url }),
  getCallScores: () => request('GET', '/api/ai/call-scores'),
  subscribePush: (subscription) => request('POST', '/api/notifications/subscribe', { subscription }),
  demoCall: () => request('POST', '/api/phone/demo-call'),
  demoStatus: () => request('GET', '/api/phone/demo-status'),
  saveCallLogTranscript: (id, transcript, duration) => request('POST', '/api/call-logs/transcript', { call_log_id: id, transcript, duration }),
  getRecordingComments: (id) => request('GET', '/api/recordings/' + id + '/comments'),
  addRecordingComment: (id, body, timestampSec) => request('POST', '/api/recordings/' + id + '/comments', { body, timestamp_sec: timestampSec }),
  deleteRecording: (id) => request('DELETE', '/api/recordings/' + id),
  postCallInsights: (data) => request('POST', '/api/ai/post-call-insights', data),
  getCallInsights: (callLogId) => request('GET', '/api/ai/call-insights/' + callLogId),
  getTranscriptionConfig: () => request('GET', '/api/transcription/config'),
  setTranscriptionConfig: (provider) => request('POST', '/api/transcription/config', { provider }),
  getTranscriptionToken: () => request('POST', '/api/transcription/token'),
  // Phone line management
  getPhoneLines: () => request('GET', '/api/admin/phone-lines'),
  assignPhoneLine: (data) => request('POST', '/api/admin/phone-lines', data),
  updatePhoneLine: (id, data) => request('PATCH', '/api/admin/phone-lines/' + id, data),
  deletePhoneLine: (id) => request('DELETE', '/api/admin/phone-lines/' + id),
  getTelnyxNumbers: () => request('GET', '/api/admin/telnyx-numbers'),
};

export default api;