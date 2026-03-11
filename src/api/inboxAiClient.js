// Inbox AI API client
const BASE = import.meta.env.VITE_API_BASE || 'https://web-production-bb17f2.up.railway.app';

async function request(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),
  getPhoneToken: () => request('GET', '/api/phone/token'),
  getPhoneMe: () => request('GET', '/api/phone/me'),
  getCallLogs: (filter) => request('GET', '/api/call-logs' + (filter ? '?filter=' + filter : '')),
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
};

export default api;