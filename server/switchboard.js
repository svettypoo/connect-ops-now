'use strict';

// ─── Switchboard: server-side SIP bridge via Telnyx Call Control + Media Streaming ─
// All calls are placed/received server-side; audio relayed to browser via WebSocket.
// Works on Railway (all TCP) — no browser WebRTC to external servers needed.

const WebSocket = require('ws');
const https     = require('https');

const CALL_CONTROL_APP_ID = '2911967655273432744'; // Telnyx Call Control App

const TELNYX_KEY  = () => process.env.TELNYX_API_KEY;
const FROM_NUMBER = () => process.env.TELNYX_FROM_NUMBER || '+15878643090';
const WEBHOOK_BASE = 'https://phone.stproperties.com';

// ── State maps ────────────────────────────────────────────────────────────────
const browserSockets = new Map();  // sessionId  → WebSocket (browser)
const callToSession  = new Map();  // callControlId → sessionId
const telnyxStreams   = new Map();  // callControlId → WebSocket (Telnyx stream)

// ── Helpers ───────────────────────────────────────────────────────────────────

function tryJson(s) { try { return JSON.parse(s); } catch { return s; } }

function telnyxPost(path_, body) {
  return new Promise((resolve, reject) => {
    const key     = TELNYX_KEY();
    if (!key) return reject(new Error('TELNYX_API_KEY not set'));
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telnyx.com',
      path: '/v2' + path_,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: tryJson(d) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sendBrowser(sessionId, msg) {
  const ws = browserSockets.get(sessionId);
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function sessionForCall(callControlId, clientStateB64) {
  if (callToSession.has(callControlId)) return callToSession.get(callControlId);
  if (clientStateB64) {
    try {
      const { sessionId } = JSON.parse(Buffer.from(clientStateB64, 'base64').toString());
      if (sessionId) { callToSession.set(callControlId, sessionId); return sessionId; }
    } catch {}
  }
  return null;
}

// ── Browser WebSocket handler ─────────────────────────────────────────────────

function handleBrowserSocket(ws, sessionId) {
  browserSockets.set(sessionId, ws);
  console.log('[Switchboard] Browser connected:', sessionId);

  ws.on('message', async raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'call')   return handleMakeCall(ws, sessionId, msg.to, msg.name);
    if (msg.type === 'hangup') return handleHangup(sessionId);
    if (msg.type === 'answer') return handleAnswer(sessionId);
    if (msg.type === 'dtmf')   return handleDtmf(sessionId, msg.digit);
    if (msg.type === 'hold')   return handleHold(sessionId, true);
    if (msg.type === 'unhold') return handleHold(sessionId, false);

    // Mic audio from browser → relay to Telnyx streaming WebSocket
    if (msg.type === 'audio') {
      const ccid = [...callToSession.entries()].find(([,v]) => v === sessionId)?.[0];
      if (ccid) {
        const stream = telnyxStreams.get(ccid);
        if (stream && stream.readyState === WebSocket.OPEN) {
          stream.send(JSON.stringify({ event: 'media', media: { payload: msg.payload } }));
        }
      }
    }
  });

  ws.on('close', () => {
    browserSockets.delete(sessionId);
    // Hang up any active call
    for (const [ccid, sid] of callToSession.entries()) {
      if (sid === sessionId) {
        telnyxPost(`/calls/${ccid}/actions/hangup`, {}).catch(() => {});
        callToSession.delete(ccid);
        telnyxStreams.delete(ccid);
        break;
      }
    }
    console.log('[Switchboard] Browser disconnected:', sessionId);
  });

  ws.on('error', err => console.error('[Switchboard] Browser WS error:', err.message));
}

// ── Call control actions ──────────────────────────────────────────────────────

async function handleMakeCall(ws, sessionId, to, name) {
  try {
    const clientState = Buffer.from(JSON.stringify({ sessionId })).toString('base64');
    const r = await telnyxPost('/calls', {
      connection_id: CALL_CONTROL_APP_ID,
      to,
      from: FROM_NUMBER(),
      webhook_url: `${WEBHOOK_BASE}/api/phone/switchboard-webhook`,
      client_state: clientState,
      timeout_secs: 30,
    });
    if (r.status >= 400) {
      ws.send(JSON.stringify({ type: 'error', message: 'Call failed: ' + JSON.stringify(r.body).slice(0, 120) }));
      return;
    }
    const ccid = r.body?.data?.call_control_id;
    if (!ccid) {
      ws.send(JSON.stringify({ type: 'error', message: 'No call_control_id returned' }));
      return;
    }
    callToSession.set(ccid, sessionId);
    ws.send(JSON.stringify({ type: 'calling', callControlId: ccid, to, name: name || to }));
    console.log('[Switchboard] Outbound call initiated:', ccid, '->', to);
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: e.message }));
  }
}

async function handleHangup(sessionId) {
  for (const [ccid, sid] of callToSession.entries()) {
    if (sid === sessionId) {
      await telnyxPost(`/calls/${ccid}/actions/hangup`, {}).catch(() => {});
      callToSession.delete(ccid);
      telnyxStreams.delete(ccid);
      return;
    }
  }
}

async function handleAnswer(sessionId) {
  for (const [ccid, sid] of callToSession.entries()) {
    if (sid === sessionId) {
      const clientState = Buffer.from(JSON.stringify({ sessionId })).toString('base64');
      await telnyxPost(`/calls/${ccid}/actions/answer`, {
        webhook_url: `${WEBHOOK_BASE}/api/phone/switchboard-webhook`,
        client_state: clientState,
      }).catch(() => {});
      return;
    }
  }
}

async function handleDtmf(sessionId, digit) {
  for (const [ccid, sid] of callToSession.entries()) {
    if (sid === sessionId) {
      await telnyxPost(`/calls/${ccid}/actions/send_dtmf`, { digits: String(digit) }).catch(() => {});
      return;
    }
  }
}

async function handleHold(sessionId, hold) {
  for (const [ccid, sid] of callToSession.entries()) {
    if (sid === sessionId) {
      await telnyxPost(`/calls/${ccid}/actions/${hold ? 'hold' : 'unhold'}`, {}).catch(() => {});
      return;
    }
  }
}

// ── Telnyx streaming WebSocket handler ───────────────────────────────────────

function handleTelnyxStream(ws, callControlId) {
  telnyxStreams.set(callControlId, ws);
  console.log('[Switchboard] Telnyx stream connected for call:', callControlId);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.event === 'media') {
      // Audio from Telnyx (remote party) → relay to browser
      const sessionId = callToSession.get(callControlId);
      if (sessionId) sendBrowser(sessionId, { type: 'audio', payload: msg.media?.payload, track: msg.media?.track });
    } else if (msg.event === 'start') {
      console.log('[Switchboard] Stream started:', callControlId, msg.start);
    } else if (msg.event === 'stop') {
      console.log('[Switchboard] Stream stopped:', callControlId);
      telnyxStreams.delete(callControlId);
    }
  });

  ws.on('close', () => { telnyxStreams.delete(callControlId); });
  ws.on('error', err => console.error('[Switchboard] Telnyx stream error:', err.message));
}

// ── Webhook handler (call events from Telnyx) ─────────────────────────────────

async function handleWebhook(event) {
  const type    = event.event_type;
  const payload = event.payload || {};
  const ccid    = payload.call_control_id;

  const sessionId = sessionForCall(ccid, payload.client_state);
  if (!sessionId) {
    console.log('[Switchboard] Webhook for unknown session, type:', type, 'ccid:', ccid);
    return false; // Signal: not a switchboard call
  }

  console.log('[Switchboard] Webhook:', type, 'ccid:', ccid, 'session:', sessionId);

  if (type === 'call.initiated') {
    const dir = payload.direction; // 'outgoing' or 'incoming'
    if (dir === 'incoming') {
      callToSession.set(ccid, sessionId);
      sendBrowser(sessionId, { type: 'ringing', callControlId: ccid, from: payload.from, name: payload.from });
    } else {
      sendBrowser(sessionId, { type: 'calling', callControlId: ccid });
    }
  }

  if (type === 'call.answered') {
    sendBrowser(sessionId, { type: 'active', callControlId: ccid });
    // Start bidirectional media streaming
    const r = await telnyxPost(`/calls/${ccid}/actions/streaming_start`, {
      stream_url: `wss://phone.stproperties.com/ws/telnyx-stream/${ccid}`,
      stream_track: 'inbound_track', // Start with inbound (what we hear); outbound adds latency
      enable_dialogflow: false,
    }).catch(e => ({ status: 500, body: e.message }));
    console.log('[Switchboard] streaming_start status:', r.status);
  }

  if (type === 'call.speak.ended') {
    // TTS done — no action needed
  }

  if (type === 'call.hangup' || type === 'call.failed') {
    sendBrowser(sessionId, { type: 'hangup', cause: payload.hangup_cause });
    callToSession.delete(ccid);
    telnyxStreams.delete(ccid);
  }

  return true; // Handled
}

// ── Inbound call: map to an available browser session ─────────────────────────

function assignInboundCall(ccid, from) {
  // Assign to first connected browser session
  for (const [sessionId] of browserSockets) {
    callToSession.set(ccid, sessionId);
    sendBrowser(sessionId, { type: 'ringing', callControlId: ccid, from, name: from });
    console.log('[Switchboard] Inbound assigned to session:', sessionId);
    return true;
  }
  return false;
}

module.exports = { handleBrowserSocket, handleTelnyxStream, handleWebhook, assignInboundCall, callToSession, telnyxStreams };
