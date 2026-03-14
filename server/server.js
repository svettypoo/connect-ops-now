// server.js — S&T Phone: standalone Express backend
'use strict';

// ─── Crash protection — MUST be first, before any require() that might throw ─
process.on('uncaughtException', (err) => {
  console.error('[CRASH GUARD] uncaughtException — process kept alive:', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH GUARD] unhandledRejection — process kept alive:', reason?.stack || reason);
});

// Load environment
require('fs').existsSync('.env') && require('fs').readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const http    = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');
const jwt = require('jsonwebtoken');
const { ImapFlow } = require('imapflow');

// Authenticate an @stproperties.com user against Zoho IMAP
async function zohoImapAuth(email, password) {
  const client = new ImapFlow({
    host: 'mail.stproperties.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch {
    return false;
  }
}

let userOps, sessionOps, contactOps, phoneOps, smsOps, voicemailOps, callLogOps,
    recordingOps, recordingCommentOps, meetingOps, devicePrefsOps, insightOps, ensureAdminUser, db;
let DB_LOAD_ERROR = null;
try {
  ({ userOps, sessionOps, contactOps, phoneOps, smsOps, voicemailOps, callLogOps,
     recordingOps, recordingCommentOps, meetingOps, devicePrefsOps, insightOps, ensureAdminUser, db } = require('./db'));
  console.log('[DB] Loaded successfully. Node version:', process.version);
} catch (e) {
  DB_LOAD_ERROR = e.message;
  console.error('[DB] FAILED TO LOAD — server will start but DB routes will error:', e.message);
}

const ai = require('./ai');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'recordings');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Supabase Storage (persistent recording storage — survives Railway redeploys) ─
const SUPABASE_URL = 'https://xocfduqugghailalzlqy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvY2ZkdXF1Z2doYWlsYWx6bHF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0ODI1OCwiZXhwIjoyMDg4MzI0MjU4fQ.DtFw3PYu9nU3PwFJv26TwKPkFSPTZQhJoJgXbF_lwyw';
const SUPABASE_BUCKET = 'call-recordings';

// Ensure bucket exists on startup (idempotent — 409 = already exists)
fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
  method: 'POST',
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: SUPABASE_BUCKET, name: SUPABASE_BUCKET, public: false }),
}).then(r => { if (r.status !== 200 && r.status !== 409) console.warn('[Supabase] bucket create status:', r.status); })
  .catch(e => console.warn('[Supabase] bucket init error:', e.message));

async function uploadToSupabase(localPath, remoteFilename) {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(remoteFilename).toLowerCase();
  const contentType = ext === '.wav' ? 'audio/wav' : ext === '.webm' ? 'audio/webm' : 'audio/mpeg';
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${remoteFilename}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: fileBuffer,
  });
  if (!up.ok) { const e = await up.text(); throw new Error(`Supabase upload ${up.status}: ${e.slice(0, 100)}`); }
  const sig = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET}/${remoteFilename}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 315360000 }),
  });
  if (!sig.ok) throw new Error(`Supabase sign ${sig.status}`);
  const { signedURL } = await sig.json();
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use('/dl', express.static(path.join(__dirname, '..', 'dl')));

// Serve mockup files from project root
app.get('/mockup-v2', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'phone-mockup-v2.html'));
});
app.get('/architecture', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'architecture.html'));
});

// ─── Auth middleware ───────────────────────────────────────────────────────────

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

// Supabase ES256 public key (from JWKS endpoint) for JWT verification
const SUPABASE_ES256_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXOD4KOl+pwQ0+GD5rvMJT2ntE0Df
hEKsAkWOBkGir28CMNGwbxH1/ClFKahJLvoXKblRyB5v7GIbDIcnYkBGAA==
-----END PUBLIC KEY-----`;

// Verify a Supabase JWT and auto-provision user in local DB
function verifySupabaseJWT(authHeader) {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];

  // Try ES256 (current Supabase signing) first, then HS256 (legacy)
  let payload = null;
  try {
    payload = jwt.verify(token, SUPABASE_ES256_PUBLIC_KEY, { algorithms: ['ES256'] });
  } catch {
    if (SUPABASE_JWT_SECRET) {
      try {
        payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
      } catch { return null; }
    } else {
      return null;
    }
  }

  if (!payload || !payload.email) return null;
  // Auto-provision user in local DB if needed
  let user = userOps.findByEmail(payload.email);
  if (!user) {
    const name = payload.user_metadata?.full_name
      || payload.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    userOps.createFromZoho(payload.email, name);
    user = userOps.findByEmail(payload.email);
  }
  return user;
}

function requireAuth(req, res, next) {
  // 1. Try local session (cookie or header)
  const token = req.cookies.session || req.headers['x-session'];
  if (token) {
    const session = sessionOps.get(token);
    if (session) {
      req.user = session;
      req.sessionId = token;
      return next();
    }
  }
  // 2. Try Supabase SSO JWT (injected by Svet Browser extension)
  const ssoUser = verifySupabaseJWT(req.headers.authorization);
  if (ssoUser) {
    // Create a local session so subsequent requests are faster
    const sessionId = sessionOps.create(ssoUser.id);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('session', sessionId, {
      httpOnly: true, secure: isProd, maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: isProd ? 'none' : 'lax',
    });
    req.user = ssoUser;
    req.sessionId = sessionId;
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

function optionalAuth(req, res, next) {
  const token = req.cookies.session || req.headers['x-session'];
  if (token) {
    const session = sessionOps.get(token);
    if (session) { req.user = session; req.sessionId = token; }
  }
  if (!req.user) {
    const ssoUser = verifySupabaseJWT(req.headers.authorization);
    if (ssoUser) { req.user = ssoUser; }
  }
  next();
}

function requireAI(req, res, next) {
  if (!ai.isConfigured()) return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' });
  next();
}

// ─── Routes: Health ───────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ ok: !DB_LOAD_ERROR, node: process.version, db: DB_LOAD_ERROR || 'ok' }));
app.get('/health',     (req, res) => res.json({ ok: !DB_LOAD_ERROR, node: process.version, db: DB_LOAD_ERROR || 'ok' }));

// ─── Routes: Auth ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  let user = null;
  const isStProperties = email.toLowerCase().endsWith('@stproperties.com');

  // Try local DB first (seeded users + previously provisioned)
  user = userOps.verify(email, password);

  // For @stproperties.com, fall back to mail server IMAP auth + auto-provision
  if (!user && isStProperties) {
    const imapOk = await zohoImapAuth(email, password).catch(() => false);
    if (imapOk) {
      user = userOps.findByEmail(email);
      if (!user) {
        const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        userOps.createFromZoho(email, name);
        user = userOps.findByEmail(email);
      }
    }
  }

  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const sessionId = sessionOps.create(user.id);
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('session', sessionId, {
    httpOnly: true,
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax',
  });
  // Return session token in body for Capacitor/APK builds (cross-origin cookies don't persist)
  res.json({ user: { id: user.id, email: user.email, name: user.name, avatar_color: user.avatar_color }, session: sessionId });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessionOps.delete(req.sessionId);
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.user_id,
    email: req.user.email,
    name: req.user.name,
    avatar_color: req.user.avatar_color,
    settings: safeJson(req.user.settings, {}),
    ai_enabled: ai.isConfigured(),
  });
});

app.patch('/api/auth/settings', requireAuth, (req, res) => {
  const current = safeJson(req.user.settings, {});
  const updated = { ...current, ...req.body };
  userOps.updateSettings(req.user.user_id, updated);
  res.json({ ok: true, settings: updated });
});

app.patch('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { name, email, password } = req.body;
    userOps.updateProfile(req.user.user_id, { name, email, password });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Routes: Phone Contacts ───────────────────────────────────────────────────

app.get('/api/phone-contacts', requireAuth, (req, res) => {
  const q = req.query.q || '';
  const contacts = q
    ? contactOps.phoneSearch(req.user.user_id, q)
    : contactOps.phoneList(req.user.user_id);
  res.json({ contacts });
});

app.post('/api/phone-contacts', requireAuth, (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  if (!name && !phone) return res.status(400).json({ error: 'name or phone required' });
  const c = contactOps.phoneCreate({ user_id: req.user.user_id, name: name || '', email: email || '', phone: phone || '', company: company || '', notes: notes || '' });
  res.json(c);
});

app.patch('/api/phone-contacts/:id', requireAuth, (req, res) => {
  contactOps.phoneUpdate(req.params.id, req.user.user_id, req.body);
  res.json({ ok: true });
});

app.delete('/api/phone-contacts/:id', requireAuth, (req, res) => {
  contactOps.phoneDelete(req.params.id, req.user.user_id);
  res.json({ ok: true });
});

// ─── Shared phone-account helper ──────────────────────────────────────────────
function getPhoneOwnerUserId(requestingUserId) {
  const all = phoneOps.all();
  if (!all.length) return requestingUserId;
  const own = all.find(c => c.user_id === requestingUserId);
  if (own) return own.user_id;
  return all[0].user_id;
}

// ─── Routes: SMS ──────────────────────────────────────────────────────────────

app.get('/api/sms/threads', requireAuth, (req, res) => {
  try {
    const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
    const threads = smsOps.listThreads(phoneUserId);
    const contacts = contactOps.phoneList(req.user.user_id);
    const enriched = threads.map(t => {
      const clean = (t.contact_number || '').replace(/\D/g, '');
      const c = contacts.find(c => c.phone && c.phone.replace(/\D/g, '').includes(clean));
      return { ...t, contact_name: c ? c.name : null };
    });
    res.json({ threads: enriched });
  } catch (e) {
    console.error('[sms/threads]', e.message);
    res.json({ threads: [] });
  }
});

app.get('/api/sms/thread/:number', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  const msgs = smsOps.listThread(phoneUserId, req.params.number);
  res.json({ messages: msgs });
});

app.post('/api/sms/thread/:number/read', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  smsOps.markThreadRead(phoneUserId, req.params.number);
  res.json({ ok: true });
});

app.post('/api/sms/send', requireAuth, async (req, res) => {
  const { to, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });
  // Normalize to E.164: strip everything except digits, prepend +1 if needed
  let normalized = to.replace(/[^\d+]/g, '');
  if (!normalized.startsWith('+')) {
    if (normalized.length === 10) normalized = '+1' + normalized;
    else if (normalized.length === 11 && normalized.startsWith('1')) normalized = '+' + normalized;
    else normalized = '+' + normalized;
  }
  const fromNumber = process.env.TELNYX_FROM_NUMBER || '';
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  try {
    const response = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.TELNYX_API_KEY}` },
      body: JSON.stringify({ from: fromNumber, to: normalized, text: body, ...(process.env.TELNYX_MESSAGING_PROFILE_ID ? { messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.errors?.[0]?.detail || 'Send failed' });
    const msg = smsOps.create({ user_id: phoneUserId, direction: 'outbound', from_number: fromNumber, to_number: normalized, body, status: 'sent', telnyx_message_id: data.data?.id || '' });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sms/suggest-replies', requireAuth, requireAI, async (req, res) => {
  const number = req.query.number;
  if (!number) return res.json({ suggestions: [] });
  const messages = smsOps.listThread(req.user.user_id, decodeURIComponent(number));
  if (!messages || !messages.length) return res.json({ suggestions: [] });
  const ctx = messages.slice(-8).map(m => `${m.direction === 'inbound' ? 'Them' : 'Me'}: ${m.body}`).join('\n');
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: `SMS conversation:\n${ctx}\n\nGenerate exactly 3 short SMS reply suggestions (each under 100 chars). Return as JSON array of strings only, no explanation.` }]
    });
    const raw = msg.content?.[0]?.text || '[]';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    res.json({ suggestions: Array.isArray(parsed) ? parsed.slice(0, 3) : [] });
  } catch (e) { res.json({ suggestions: [] }); }
});

app.post('/api/sms/suggest-replies', requireAuth, requireAI, async (req, res) => {
  const { messages } = req.body;
  if (!messages || !messages.length) return res.json({ suggestions: [] });
  const ctx = messages.slice(-8).map(m => `${m.direction === 'inbound' ? 'Them' : 'Me'}: ${m.body}`).join('\n');
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: `SMS conversation:\n${ctx}\n\nGenerate exactly 3 short SMS reply suggestions (each under 100 chars). Return as JSON array of strings only, no explanation.` }]
    });
    const raw = msg.content?.[0]?.text || '[]';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    res.json({ suggestions: Array.isArray(parsed) ? parsed.slice(0, 3) : [] });
  } catch (e) { res.json({ suggestions: [] }); }
});

// ─── Routes: Voicemails ───────────────────────────────────────────────────────

app.get('/api/voicemails', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  res.json({ voicemails: voicemailOps.list(phoneUserId) });
});

app.patch('/api/voicemails/:id/read', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  voicemailOps.markRead(req.params.id, phoneUserId);
  res.json({ ok: true });
});

app.get('/api/voicemails/:id/audio', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  const vms = db.prepare('SELECT * FROM voicemails WHERE id=? AND user_id=?').get(req.params.id, phoneUserId);
  if (!vms || !vms.filename) return res.status(404).end();
  const filepath = path.join(uploadsDir, vms.filename);
  if (!fs.existsSync(filepath)) {
    if (vms.storage_url) return res.redirect(302, vms.storage_url);
    return res.status(404).end();
  }
  const stat = fs.statSync(filepath);
  const range = req.headers.range;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  if (range) {
    const [s, e] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(s, 10), end = e ? parseInt(e, 10) : stat.size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': stat.size });
    fs.createReadStream(filepath).pipe(res);
  }
  voicemailOps.markRead(req.params.id, phoneUserId);
});

// ─── Routes: Call logs ────────────────────────────────────────────────────────

app.get('/api/call-logs', requireAuth, (req, res) => {
  const { filter, limit } = req.query;
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  res.json({ call_logs: callLogOps.list(phoneUserId, { filter, limit: parseInt(limit) || 50 }) });
});

// Client-side call log creation (WebRTC calls — no server-side webhook for credential connections)
app.post('/api/call-logs', requireAuth, (req, res) => {
  if (!callLogOps) return res.status(503).json({ error: 'DB not ready' });
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  const { direction, from_number, to_number, from_name, to_name, status, duration, started_at, ended_at, transcript } = req.body;
  const log = callLogOps.create({
    user_id: phoneUserId,
    direction: direction || 'outbound',
    from_number: from_number || '',
    to_number: to_number || '',
    from_name: from_name || '',
    to_name: to_name || '',
    status: status || 'ended',
    started_at: started_at || new Date().toISOString(),
  });
  const updates = {};
  if (duration !== undefined) updates.duration = duration;
  if (ended_at) updates.ended_at = ended_at;
  if (transcript) updates.transcript = transcript;
  if (Object.keys(updates).length) callLogOps.update(log.id, updates);
  res.json(log);
});

app.delete('/api/call-logs/:id', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  db.prepare('DELETE FROM call_logs WHERE id=? AND user_id=?').run(req.params.id, phoneUserId);
  res.json({ ok: true });
});

app.post('/api/call-logs/transcript', requireAuth, async (req, res) => {
  try {
    const { transcript, duration, contact_name, contact_number, status: callStatus, hangup_cause } = req.body;
    const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    let log = db.prepare(
      `SELECT * FROM call_logs WHERE user_id=? AND created_at > ? ORDER BY created_at DESC LIMIT 1`
    ).get(phoneUserId, cutoff);

    if (!log) {
      log = callLogOps.create({
        user_id: phoneUserId,
        direction: 'outbound',
        to_number: contact_number || '',
        to_name: contact_name || '',
        from_number: '',
        status: callStatus || (duration > 0 ? 'answered' : 'missed'),
        started_at: new Date(Date.now() - (duration || 0) * 1000).toISOString(),
      });
    }

    let ai_summary = '';
    if (transcript && transcript.trim()) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const summaryResp = await claude.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: `Summarize this phone call transcript in 2-3 bullet points. Be concise — key topics, action items, decisions only. No filler.\n\nTranscript:\n${transcript}` }]
        });
        ai_summary = summaryResp.content[0].text.trim();
      } catch(e) {
        console.warn('[CallTranscript] AI summary failed:', e.message);
      }
    }

    callLogOps.update(log.id, {
      transcript: transcript || '',
      ai_summary,
      ...(duration != null ? { duration } : {}),
      ...(contact_name ? { to_name: contact_name } : {}),
      status: callStatus || (duration > 0 ? 'answered' : log.status === 'initiated' ? 'missed' : log.status),
    });

    res.json({ ok: true, id: log.id, ai_summary });
  } catch(e) {
    console.error('[CallTranscript]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Routes: Post-call AI chips ───────────────────────────────────────────────

app.post('/api/ai/post-call-insights', requireAuth, requireAI, async (req, res) => {
  try {
    const { transcript, duration, contact_name, contact_number, call_log_id } = req.body;
    if (!transcript || !transcript.trim()) return res.json({ tasks: [], email_draft: '', summary: '' });

    const Anthropic = require('@anthropic-ai/sdk');
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You just had a phone call with ${contact_name || contact_number || 'a contact'} (${Math.round(duration || 0)} seconds). Here is the transcript:

${transcript}

Generate a JSON object with:
1. "tasks": array of up to 3 action items (strings, imperative, under 60 chars each)
2. "email_draft": a short follow-up email body (2-4 sentences, no subject/greeting line)
3. "summary": 1-sentence call summary

Return ONLY valid JSON, no markdown, no explanation.`;

    const msg = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content?.[0]?.text?.trim() || '{}';
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()); }
    catch { parsed = {}; }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 3) : [];
    const email_draft = parsed.email_draft || '';
    const summary = parsed.summary || '';

    const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
    const insight = insightOps.create({ user_id: phoneUserId, call_log_id: call_log_id || null, tasks, email_draft, summary });

    res.json({ tasks, email_draft, summary, id: insight.id });
  } catch (e) {
    console.error('[post-call-insights]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ai/call-insights/:callLogId', requireAuth, (req, res) => {
  try {
    const insight = insightOps.getByCallLog(req.params.callLogId);
    if (!insight) return res.json(null);
    res.json({ ...insight, tasks: JSON.parse(insight.tasks || '[]') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Routes: Stats ────────────────────────────────────────────────────────────

app.get('/api/stats', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  res.json({
    unreadVoicemails: voicemailOps.countUnread(phoneUserId),
    unreadSms: smsOps.countUnread(phoneUserId),
    totalCalls: callLogOps.count(phoneUserId),
    missedCalls: callLogOps.countMissed(phoneUserId),
  });
});

// ─── Routes: Telnyx Phone ─────────────────────────────────────────────────────

// Legacy token redirect — kept for backward compat
app.get('/api/phone/token', requireAuth, (req, res) => {
  res.redirect('/api/phone/webrtc-token');
});

// Telnyx WebRTC — telephony_credential IDs (linked to credential connections)
const TELNYX_CRED_IDS = {
  svet:  '2344c5e0-f419-4532-8450-939564b59895',
  hr:    '702038e2-7c6c-4c9b-8239-cbf2e390f78a',
  info:  '086f1b0c-acce-46d4-a3af-dfa4902836a6',
  line2: 'cc5a2bdc-8fbf-414d-aec4-f0c541bc9904',
};
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

async function getTelnyxWebRtcToken(credId) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.telnyx.com',
      path: `/v2/telephony_credentials/${credId}/token`,
      method: 'POST',
      headers: { Authorization: `Bearer ${TELNYX_API_KEY}`, 'Content-Length': 0 },
    };
    const req = https.request(opts, (r) => {
      let body = '';
      r.on('data', d => body += d);
      r.on('end', () => {
        if (r.statusCode === 201) resolve(body.trim().replace(/^"|"$/g, ''));
        else reject(new Error(`Telnyx token failed: ${r.statusCode} ${body}`));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

app.get('/api/phone/sip-config', requireAuth, async (req, res) => {
  try {
    const email = req.user.email || '';
    let key = email.split('@')[0] || 'hr';
    if (!TELNYX_CRED_IDS[key]) key = 'hr';

    let dbCred = phoneOps.get(req.user.user_id);
    if (!dbCred) {
      dbCred = phoneOps.upsert(req.user.user_id, {
        telnyx_cred_id: TELNYX_CRED_IDS[key],
        telnyx_sip_user: key,
        phone_number: process.env.TELNYX_FROM_NUMBER || '+15878643090',
      });
    }

    const credId = TELNYX_CRED_IDS[key];
    const login_token = await getTelnyxWebRtcToken(credId);

    res.json({
      login_token,
      phone_number: dbCred.phone_number || process.env.TELNYX_FROM_NUMBER || '+15878643090',
    });
  } catch (e) {
    console.error('[sip-config] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/phone/me', requireAuth, (req, res) => {
  const cred = phoneOps.get(req.user.user_id);
  res.json({ phone_number: cred?.phone_number || null, sip_user: cred?.telnyx_sip_user || null });
});

// Client-side call recording upload (SIP.js MediaRecorder → server → Supabase)
const multer = require('multer');
const recUpload = multer({ dest: uploadsDir, limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/phone/upload-recording', requireAuth, recUpload.single('recording'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No recording file' });
    const { from_number, to_number, duration } = req.body;
    const ext = path.extname(req.file.originalname) || '.webm';
    const filename = `call_${req.user.user_id}_${Date.now()}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    fs.renameSync(req.file.path, finalPath);
    console.log('[recording] client upload saved:', filename, fs.statSync(finalPath).size, 'bytes');

    // Upload to Supabase for persistence
    let storageUrl = '';
    try {
      storageUrl = await uploadToSupabase(finalPath, filename);
      console.log('[recording] uploaded to Supabase:', storageUrl.slice(0, 80));
    } catch (e) { console.error('[recording] Supabase upload failed:', e.message); }

    // Transcribe with Deepgram if available
    let transcript = '';
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (dgKey) {
      try {
        const audio = fs.readFileSync(finalPath);
        const ct = ext === '.webm' ? 'audio/webm' : 'audio/mpeg';
        const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true', {
          method: 'POST',
          headers: { 'Authorization': `Token ${dgKey}`, 'Content-Type': ct },
          body: audio,
        });
        const dgData = await dgRes.json();
        transcript = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      } catch (e) { console.warn('[recording] Deepgram transcription failed:', e.message); }
    }

    // Save to DB
    const title = `Call ${from_number || 'unknown'} → ${to_number || 'unknown'}`;
    const { id: recId } = recordingOps.create({
      userId: req.user.user_id,
      title,
      filename,
      duration: parseInt(duration) || 0,
      size: fs.statSync(finalPath).size,
      storageUrl,
    });
    if (transcript) recordingOps.update(recId, req.user.user_id, { transcript });

    res.json({ ok: true, recording_id: recId, transcript: transcript ? transcript.slice(0, 200) + '…' : '' });
  } catch (e) {
    console.error('[recording] upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/phone/park', requireAuth, async (req, res) => {
  const { call_control_id } = req.body;
  if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
  try {
    const r = await telnyxRest('POST', `/calls/${call_control_id}/actions/hold`, {});
    res.json({ ok: r.status < 300, slot: call_control_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phone/unpark', requireAuth, async (req, res) => {
  const { call_control_id } = req.body;
  if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
  try {
    const r = await telnyxRest('POST', `/calls/${call_control_id}/actions/unhold`, {});
    res.json({ ok: r.status < 300 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phone/recording/start', requireAuth, async (req, res) => {
  const { call_control_id } = req.body;
  if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
  try {
    const r = await telnyxRest('POST', `/calls/${call_control_id}/actions/record_start`, { format: 'wav', channels: 'dual' });
    res.json({ ok: r.status < 300, status: r.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phone/recording/stop', requireAuth, async (req, res) => {
  const { call_control_id } = req.body;
  if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
  try {
    const r = await telnyxRest('POST', `/calls/${call_control_id}/actions/record_stop`, {});
    res.json({ ok: r.status < 300, status: r.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/phone/recordings', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  res.json({ recordings: recordingOps.listByUser(phoneUserId) });
});

app.post('/api/phone/assign', requireAuth, (req, res) => {
  const { user_id, phone_number, telnyx_cred_id, telnyx_sip_user } = req.body;
  const uid = user_id || req.user.user_id;
  try {
    const cred = phoneOps.upsert(uid, { phone_number, telnyx_cred_id: telnyx_cred_id || null, telnyx_sip_user: telnyx_sip_user || null });
    res.json({ ok: true, cred });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Debug endpoints
const _webhookLog = [];
app.get('/api/phone/webhook-log', (req, res) => res.json({ events: _webhookLog.slice(-50) }));
const _vmDebugLogs = [];
app.get('/api/phone/vm-debug', (req, res) => res.json({
  voicemailCalls: Object.entries(_voicemailCalls).map(([k,v]) => ({ ccid: k, fromNumber: v.fromNumber, answered: v.answered, _answeredByBackend: v._answeredByBackend, startedAt: v.startedAt })),
  debugLogs: _vmDebugLogs.slice(-30),
}));

// Demo call status
const _demoStatus = { steps: [], running: false };
app.get('/api/phone/demo-status', (req, res) => res.json({ ..._demoStatus, speakWaiterKeys: Object.keys(_speakWaiters) }));
function demoLog(msg) { console.log('[demo-call]', msg); _demoStatus.steps.push({ ts: new Date().toISOString().slice(11,19), msg }); }

// ─── Telnyx helpers ───────────────────────────────────────────────────────────

const https = require('https');

const VOICES = {
  male:   'Polly.Matthew-Neural',
  female: 'Polly.Joanna-Neural',
};

function ttsPayload(text) {
  return `<speak><prosody volume="+8dB">${text}</prosody></speak>`;
}

function telnyxRest(method, path_, body) {
  return new Promise((resolve, reject) => {
    const key = process.env.TELNYX_API_KEY;
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.telnyx.com',
      path: '/v2' + path_,
      method,
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (_) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const _aiCalls = {};
const _voicemailCalls = {};
const _pendingDemo = { active: false, resolve: null };
const _speakWaiters = {};
const _answeredWaiters = {};

function resolveAnsweredWaiter(ccid) {
  const r = _answeredWaiters[ccid];
  if (r) { delete _answeredWaiters[ccid]; r(); }
}
function resolveSpeakWaiter(ccid) {
  const r = _speakWaiters[ccid];
  if (r) { delete _speakWaiters[ccid]; r(); }
}
async function speakAndWait(ccid, text, voice = VOICES.female, timeout = 30000) {
  return new Promise(async (resolve) => {
    _speakWaiters[ccid] = resolve;
    const t = setTimeout(() => { if (_speakWaiters[ccid]) { delete _speakWaiters[ccid]; resolve(); } }, timeout);
    const r = await telnyxRest('POST', `/calls/${ccid}/actions/speak`, {
      payload: ttsPayload(text), payload_type: 'ssml', voice, language: 'en-US', service_level: 'premium',
    }).catch(e => ({ status: 500 }));
    if (r.status >= 400) { clearTimeout(t); delete _speakWaiters[ccid]; resolve(); }
  });
}

// ─── WebRTC login token (browser fetches this to connect @telnyx/webrtc SDK) ──

const TELNYX_CREDENTIAL_ID = process.env.TELNYX_CREDENTIAL_ID || '297f636e-c371-4687-a2eb-e089cec567da';

app.get('/api/phone/webrtc-token', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TELNYX_API_KEY not set' });

    // Resolve per-user credential ID
    const email = req.user.email || '';
    let key = email.split('@')[0] || 'hr';
    if (!TELNYX_CRED_IDS[key]) key = 'hr';
    const credId = TELNYX_CRED_IDS[key] || TELNYX_CREDENTIAL_ID;

    // Get or create phone credential record
    let dbCred = phoneOps.get(req.user.user_id);
    if (!dbCred) {
      dbCred = phoneOps.upsert(req.user.user_id, {
        telnyx_cred_id: credId,
        telnyx_sip_user: key,
        phone_number: process.env.TELNYX_FROM_NUMBER || '+15878643090',
      });
    }

    const response = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${credId}/token`,
      { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: `Telnyx error ${response.status}`, detail: text.slice(0, 200) });
    }
    const token = await response.text(); // Telnyx returns raw JWT, not JSON
    res.json({
      token: token.trim(),
      phone_number: dbCred.phone_number || process.env.TELNYX_FROM_NUMBER || '+15878643090',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Telnyx webhook (Call Control) ───────────────────────────────────────────

app.post('/api/phone/webhook', express.json(), async (req, res) => {
  res.sendStatus(200);
  const event = req.body?.data;
  if (!event) return;

  const type = event.event_type;
  const payload = event.payload || {};
  const callControlId = payload.call_control_id || event.call_control_id;
  _webhookLog.push({ type, callControlId, dir: payload.direction, from: payload.from, to: payload.to, ts: new Date().toISOString() });
  if (type.includes('speak')) console.log('[Phone webhook]', type, 'ccid:', callControlId, 'waiter?', !!_speakWaiters[callControlId]);
  else console.log('[Phone webhook]', type, callControlId);

  if (type === 'call.initiated') {
    const dir = payload.direction === 'incoming' ? 'inbound' : 'outbound';
    const fromNum = payload.from || '';
    const toNum   = payload.to   || '';
    const allCreds = phoneOps.all();
    const cred = allCreds.find(c => c.phone_number === (dir === 'inbound' ? toNum : fromNum)) || allCreds[0];
    const userId = cred?.user_id;
    if (userId) {
      const lookupNum = dir === 'inbound' ? fromNum : toNum;
      const contact = db.prepare(`SELECT name FROM phone_contacts WHERE user_id=? AND phone=? LIMIT 1`).get(userId, lookupNum);
      callLogOps.create({
        user_id: userId,
        direction: dir,
        from_number: fromNum,
        to_number: toNum,
        from_name: dir === 'inbound' ? (contact?.name || '') : '',
        to_name:   dir === 'outbound' ? (contact?.name || '') : '',
        status: 'initiated',
        call_control_id: callControlId,
        started_at: new Date().toISOString(),
      });
    }
    if (payload.direction === 'incoming' && _pendingDemo.active) {
      console.log('[Phone webhook] inbound demo leg', callControlId);
      _pendingDemo.active = false;
      await telnyxRest('POST', `/calls/${callControlId}/actions/answer`, {}).catch(() => {});
      if (_pendingDemo.resolve) { _pendingDemo.resolve(callControlId); _pendingDemo.resolve = null; }
      return;
    }
    if (payload.direction === 'incoming') {
      console.log('[Phone webhook] inbound call from', fromNum, 'to', toNum);
      const contact = userId ? db.prepare(`SELECT name FROM phone_contacts WHERE user_id=? AND phone=? LIMIT 1`).get(userId, fromNum) : null;
      const callerName = contact?.name || fromNum;

      // Inbound calls are delivered to WebRTC clients directly by Telnyx via WebSocket.
      // The webhook runs in parallel — we only handle push notifications and voicemail fallback here.
      // Do NOT try to transfer/bridge — SIP transfer can't reach WebRTC endpoints.
      console.log('[Phone webhook] no WebRTC endpoint — waiting 15s before voicemail');
      if (global._sendPushToUser) {
        global._sendPushToUser(userId || null, {
          title: 'Incoming Call',
          body: callerName,
          tag: 'call-' + callControlId,
          data: { type: 'incoming_call', from: fromNum, caller_name: callerName, call_control_id: callControlId },
        }).catch(() => {});
      }
      const vmTimeout = setTimeout(async () => {
        const entry = _voicemailCalls[callControlId];
        if (entry && !entry.answered) {
          entry._answeredByBackend = true;
          const clogForVm = callLogOps.findByCallControlId(callControlId);
          if (clogForVm) { callLogOps.update(clogForVm.id, { is_voicemail: 1 }); _vmDebugLogs.push({ ts: new Date().toISOString(), msg: 'set is_voicemail=1', ccid: callControlId }); }
          await telnyxRest('POST', `/calls/${callControlId}/actions/answer`, {}).catch(() => {});
        }
      }, 15000);
      _voicemailCalls[callControlId] = { userId, fromNumber: fromNum, fromName: callerName, startedAt: Date.now(), answered: false, _timeout: vmTimeout };
      _vmDebugLogs.push({ ts: new Date().toISOString(), msg: 'stored inbound CCID (fallback)', ccid: callControlId });
    }
  }

  if (type === 'call.answered') {
    const log = callLogOps.findByCallControlId(callControlId);
    if (log) callLogOps.update(log.id, { status: 'answered', answered_at: new Date().toISOString() });
    resolveAnsweredWaiter(callControlId);
    const vmEntry = _voicemailCalls[callControlId];
    if (vmEntry) {
      if (vmEntry._answeredByBackend) {
        console.log('[voicemail] playing greeting for', callControlId);
        telnyxRest('POST', `/calls/${callControlId}/actions/speak`, {
          payload: ttsPayload("You've reached our voicemail. Please leave your message after the tone. Press pound when finished."),
          payload_type: 'ssml',
          voice: VOICES.female,
          language: 'en-US',
          service_level: 'premium',
        }).catch(e => console.warn('[voicemail] speak error:', e.message));
      } else {
        vmEntry.answered = true;
        clearTimeout(vmEntry._timeout);
        delete _voicemailCalls[callControlId];
        telnyxRest('POST', `/calls/${callControlId}/actions/record_start`, { format: 'wav', channels: 'dual' })
          .catch(e => console.warn('[recording] record_start failed:', e.message));
      }
    } else if (callControlId && !_aiCalls[callControlId]) {
      telnyxRest('POST', `/calls/${callControlId}/actions/record_start`, { format: 'wav', channels: 'dual' })
        .catch(e => console.warn('[recording] record_start failed:', e.message));
    }
  }

  if (type === 'call.speak.ended' && callControlId) resolveSpeakWaiter(callControlId);

  if (type === 'call.speak.ended' && callControlId && _voicemailCalls[callControlId]) {
    console.log('[voicemail] greeting done — starting recording for', callControlId);
    telnyxRest('POST', `/calls/${callControlId}/actions/record_start`, { format: 'wav', channels: 'dual' })
      .catch(e => console.warn('[voicemail] record_start error:', e.message));
  }

  if (type === 'call.hangup' || type === 'call.disconnected') {
    const hangupCause = payload.hangup_cause || payload.sip_hangup_cause || 'unknown';
    const hangupSource = payload.hangup_source || 'unknown';
    console.log('[Phone webhook] hangup cause:', hangupCause, 'source:', hangupSource, 'from:', payload.from, 'to:', payload.to);
    _vmDebugLogs.push({ ts: new Date().toISOString(), msg: 'hangup', ccid: callControlId, cause: hangupCause });
    if (_voicemailCalls[callControlId] && !_voicemailCalls[callControlId].answered && !_voicemailCalls[callControlId]._answeredByBackend) {
      clearTimeout(_voicemailCalls[callControlId]._timeout);
      delete _voicemailCalls[callControlId];
    }
    const log = callLogOps.findByCallControlId(callControlId);
    if (log) {
      const endedAt = new Date().toISOString();
      const startMs = new Date(log.started_at).getTime();
      const dur = Math.round((Date.now() - startMs) / 1000);
      const wasMissed = log.status === 'initiated' && log.direction === 'inbound';
      callLogOps.update(log.id, { status: wasMissed ? 'missed' : 'ended', ended_at: endedAt, duration: dur });
    }
  }

  if (type === 'call.answered' && callControlId && _aiCalls[callControlId]) {
    const info = _aiCalls[callControlId];
    info.status = 'answered';
    info.webhookFired = true;
    console.log('[AI call] answered — starting recording, then speaking in 3s');
    try {
      await telnyxRest('POST', `/calls/${callControlId}/actions/record_start`, { format: 'wav', channels: 'dual' });
    } catch (e) { console.error('[AI call] record_start error:', e.message); }
    setTimeout(async () => {
      try {
        const r = await telnyxRest('POST', `/calls/${callControlId}/actions/speak`, {
          payload: ttsPayload(info.message), payload_type: 'ssml', voice: info.voice || VOICES.female, language: 'en-US', service_level: 'premium',
        });
        info.status = r.status === 200 || r.status === 202 ? 'speaking' : 'speak_failed';
      } catch (e) { info.status = 'error'; }
    }, 3000);
  }

  if (type === 'call.speak.ended' && callControlId && _aiCalls[callControlId]) {
    _aiCalls[callControlId].status = 'speak_done';
    setTimeout(async () => {
      await telnyxRest('POST', `/calls/${callControlId}/actions/record_stop`, {}).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await telnyxRest('POST', `/calls/${callControlId}/actions/hangup`, {}).catch(() => {});
    }, 20000);
  }

  // Demo recording notifier
  const _demoCallRecordingWaiters = _demoStatus._recordingWaiters || (_demoStatus._recordingWaiters = {});
  if (type === 'call.recording.saved' && callControlId && _demoCallRecordingWaiters[callControlId]) {
    const dur = payload.duration_secs || 0;
    if (dur > 0 && dur < 30) {
      console.log('[demo] ignoring short recording (dur=' + dur + 's)');
    } else {
      const r = _demoCallRecordingWaiters[callControlId];
      delete _demoCallRecordingWaiters[callControlId];
      r(payload.recording_urls || {});
    }
  }

  if (type === 'call.recording.saved' && callControlId) {
    const aiInfo = _aiCalls[callControlId];
    const clog = callLogOps.findByCallControlId(callControlId);
    _vmDebugLogs.push({ ts: new Date().toISOString(), msg: 'recording.saved', ccid: callControlId, clogFound: !!clog, isVoicemail: clog?.is_voicemail, inVM: !!_voicemailCalls[callControlId] });
    const urls = payload.recording_urls || {};
    const downloadUrl = urls.stereo || urls.dual || Object.values(urls)[0];
    console.log('[recording] saved for', callControlId, 'downloading:', downloadUrl);
    if (downloadUrl) {
      if (aiInfo) aiInfo.status = 'recorded';
      const filename = `call_${callControlId.replace(/[^a-z0-9]/gi,'_').slice(0,40)}_${Date.now()}.mp3`;
      const dest = path.join(uploadsDir, filename);
      const downloadWithRedirects = (url, destStream, remaining = 5) => {
        const mod = url.startsWith('https') ? https : require('http');
        mod.get(url, res => {
          if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && remaining > 0) {
            downloadWithRedirects(res.headers.location, destStream, remaining - 1);
          } else {
            res.pipe(destStream);
          }
        }).on('error', e => { console.error('[recording] download error:', e.message); destStream.destroy(); });
      };
      const file = fs.createWriteStream(dest);
      downloadWithRedirects(downloadUrl, file);
      file.on('finish', async () => {
        file.close();
        console.log('[recording] saved locally:', filename, fs.statSync(dest).size, 'bytes');
        let storageUrl = '';
        try {
          storageUrl = await uploadToSupabase(dest, filename);
          console.log('[recording] uploaded to Supabase:', storageUrl.slice(0, 80));
        } catch (e) { console.error('[recording] Supabase upload failed:', e.message); }
        const userId = aiInfo?.userId || clog?.user_id;
        const title = aiInfo
          ? `AI Call to ${aiInfo.to} (${aiInfo.voice || 'female'})`
          : `Call ${clog?.direction || ''} ${clog?.from_number || ''} -> ${clog?.to_number || ''}`;
        const getTranscript = async (audioPath) => {
          const dgKey = process.env.DEEPGRAM_API_KEY;
          if (!dgKey) return '';
          try {
            const audio = fs.readFileSync(audioPath);
            const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true', {
              method: 'POST',
              headers: { 'Authorization': `Token ${dgKey}`, 'Content-Type': 'audio/mpeg' },
              body: audio,
            });
            const dgData = await dgRes.json();
            return dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
          } catch (e) { return ''; }
        };
        const vmInfo = _voicemailCalls[callControlId]
          || (clog?.is_voicemail ? { userId: clog.user_id, fromNumber: clog.from_number, fromName: clog.from_name, startedAt: new Date(clog.started_at).getTime() } : null);
        try {
          const transcript = await getTranscript(dest);
          if (vmInfo) {
            const dur = payload.duration_secs || Math.round((Date.now() - vmInfo.startedAt) / 1000);
            const vmId = require('crypto').randomUUID();
            const audioUrl = `/api/voicemails/${vmId}/audio`;
            let aiSummary = '';
            if (transcript && ai.isConfigured()) {
              try { aiSummary = await ai.summarizeTranscript(`Voicemail from ${vmInfo.fromName || vmInfo.fromNumber}`, transcript); } catch (e) {}
            }
            voicemailOps.create({ id: vmId, user_id: vmInfo.userId || 'unknown', from_number: vmInfo.fromNumber, from_name: vmInfo.fromName, duration: dur, recording_url: audioUrl, transcript, ai_summary: aiSummary, filename, storageUrl });
            console.log('[voicemail] saved voicemail', vmId, 'from', vmInfo.fromNumber);
            if (clog) callLogOps.update(clog.id, { status: 'missed' });
            delete _voicemailCalls[callControlId];
          } else {
            const { id: recId } = recordingOps.create({ userId: userId || 'unknown', title, filename, duration: payload.duration_secs || 0, size: fs.statSync(dest).size, storageUrl });
            if (aiInfo) aiInfo.recordingId = recId;
            if (clog) callLogOps.update(clog.id, { recording_id: recId });
            if (transcript) recordingOps.update(recId, userId, { transcript });
          }
        } catch (e) { console.error('[recording] DB save error:', e.message); }
      });
      file.on('error', e => { console.error('[recording] file write error:', e.message); });
    }
  }

  if ((type === 'call.hangup' || type === 'call.disconnected') && callControlId && _aiCalls[callControlId]) {
    if (_aiCalls[callControlId].status !== 'recorded') _aiCalls[callControlId].status = 'ended';
  }
});

// ─── Telnyx general webhook (inbound SMS) ────────────────────────────────────

app.post('/webhooks/telnyx', express.json(), async (req, res) => {
  res.sendStatus(200);
  const event = req.body?.data;
  if (!event) return;
  const type = event.event_type;
  const payload = event.payload || {};

  try {
    if (type === 'message.received') {
      const fromNum = payload.from?.phone_number || '';
      const toNum   = payload.to?.[0]?.phone_number || '';
      const allCreds = phoneOps.all();
      const matchedCred = allCreds.find(c => c.phone_number === toNum) || allCreds[0];
      if (matchedCred) {
        smsOps.create({
          user_id: matchedCred.user_id,
          direction: 'inbound',
          from_number: fromNum,
          to_number: toNum,
          body: payload.text || '',
          status: 'delivered',
          telnyx_message_id: payload.id || '',
        });
        console.log('[Webhook] Inbound SMS from', fromNum, 'stored');
        if (global._sendPushToUser) {
          global._sendPushToUser(matchedCred.user_id, {
            title: 'New Message',
            body: `${fromNum}: ${(payload.text || '').slice(0, 100)}`,
            tag: 'sms-' + fromNum,
          }).catch(() => {});
        }
      }
    }
    if (type === 'message.finalized') {
      const msgId = payload.id || '';
      const deliveryStatus = payload.to?.[0]?.status || payload.delivery_state || '';
      if (msgId && deliveryStatus) {
        const statusMap = { 'delivered': 'delivered', 'delivery_failed': 'failed', 'queued': 'queued', 'sending': 'sending', 'sent': 'sent' };
        const status = statusMap[deliveryStatus] || deliveryStatus;
        try { db.prepare('UPDATE sms_messages SET status=? WHERE telnyx_message_id=?').run(status, msgId); }
        catch (e) { console.warn('[sms finalized] db update failed:', e.message); }
        console.log('[Webhook] SMS finalized:', msgId, status);
      }
    }
  } catch (err) {
    console.error('[Webhook/telnyx] Error:', err.message);
  }
});

// Also accept at /api/telnyx/webhook
app.post('/api/telnyx/webhook', express.json(), async (req, res) => {
  res.sendStatus(200);
  // Forward to main handler logic
  const event = req.body?.data;
  if (!event) return;
  const type = event.event_type;
  const payload = event.payload || {};
  if (type === 'message.received') {
    const fromNum = payload.from?.phone_number || '';
    const toNum   = payload.to?.[0]?.phone_number || '';
    const allCreds = phoneOps.all();
    const matchedCred = allCreds.find(c => c.phone_number === toNum) || allCreds[0];
    if (matchedCred) {
      smsOps.create({ user_id: matchedCred.user_id, direction: 'inbound', from_number: fromNum, to_number: toNum, body: payload.text || '', status: 'delivered', telnyx_message_id: payload.id || '' });
    }
  }
  if (type === 'message.finalized') {
    const msgId = payload.id || '';
    const deliveryStatus = payload.to?.[0]?.status || payload.delivery_state || '';
    if (msgId && deliveryStatus) {
      const statusMap = { 'delivered': 'delivered', 'delivery_failed': 'failed', 'queued': 'queued', 'sending': 'sending', 'sent': 'sent' };
      const status = statusMap[deliveryStatus] || deliveryStatus;
      try { db.prepare('UPDATE sms_messages SET status=? WHERE telnyx_message_id=?').run(status, msgId); }
      catch (e) { console.warn('[sms finalized] db update failed:', e.message); }
      console.log('[sms finalized] msgId:', msgId, 'status:', status);
    }
  }
});

// ─── AI Voice Call ────────────────────────────────────────────────────────────

app.post('/api/phone/ai-call', requireAuth, async (req, res) => {
  try {
    const { to, prompt, context, voice } = req.body;
    if (!to) return res.status(400).json({ error: 'to required' });

    const cred = phoneOps.get(req.user.user_id);
    const from = cred?.phone_number || process.env.TELNYX_FROM_NUMBER;
    if (!from) return res.status(400).json({ error: 'No phone number assigned to your account' });

    const Anthropic = require('@anthropic-ai/sdk');
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msgResp = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You write phone call scripts. Return ONLY the exact words to be spoken aloud — no meta-commentary, no labels, no quotation marks, no dashes. Just the message itself as plain spoken text.',
      messages: [{ role: 'user', content: context || prompt || 'Generate a short, warm phone greeting.' }],
    });
    const message = msgResp.content.find(b => b.type === 'text')?.text?.trim() || prompt;

    if (to === 'preview') {
      return res.json({ ok: true, message, preview: true });
    }

    const callResp = await telnyxRest('POST', '/calls', {
      to, from, connection_id: '2911967655273432744',
    });

    if (callResp.status !== 200 && callResp.status !== 201) {
      return res.status(500).json({ error: 'Telnyx call failed', details: callResp.body });
    }

    const callControlId = callResp.body?.data?.call_control_id;
    if (!callControlId) return res.status(500).json({ error: 'No call_control_id from Telnyx' });

    const selectedVoice = (voice === 'male') ? VOICES.male : VOICES.female;
    _aiCalls[callControlId] = { status: 'ringing', message, to, from, voice: selectedVoice, userId: req.user.user_id, webhookFired: false };

    res.json({ ok: true, call_control_id: callControlId, message, voice: selectedVoice });

    setTimeout(() => {
      if (!_aiCalls[callControlId]?.webhookFired) {
        pollAndSpeak(callControlId, message, selectedVoice);
      }
    }, 10000);

  } catch (e) {
    console.error('[ai-call]', e);
    res.status(500).json({ error: e.message });
  }
});

async function pollAndSpeak(callControlId, message, voice = VOICES.female) {
  const MAX_WAIT_MS = 120_000;
  const POLL_INTERVAL = 2_000;
  const POST_ANSWER_DELAY = 3_000;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    await telnyxRest('POST', `/calls/${callControlId}/actions/record_start`, { format: 'wav', channels: 'dual' }).catch(() => {});
    const r = await telnyxRest('POST', `/calls/${callControlId}/actions/speak`, {
      payload: ttsPayload(message), payload_type: 'ssml', voice, language: 'en-US', service_level: 'premium',
    });
    if (r.status === 200 || r.status === 201 || r.status === 202) {
      if (_aiCalls[callControlId]) _aiCalls[callControlId].status = 'speaking';
      return;
    }
    if (r.status === 404) { if (_aiCalls[callControlId]) _aiCalls[callControlId].status = 'ended'; return; }
    const errCode = r.body?.errors?.[0]?.code;
    if (errCode === '90022' || errCode === '10012') {
      if (_aiCalls[callControlId]) _aiCalls[callControlId].status = 'answered_delay';
      await new Promise(r => setTimeout(r, POST_ANSWER_DELAY));
      const r2 = await telnyxRest('POST', `/calls/${callControlId}/actions/speak`, {
        payload: ttsPayload(message), payload_type: 'ssml', voice, language: 'en-US', service_level: 'premium',
      });
      if (_aiCalls[callControlId]) _aiCalls[callControlId].status = r2.status < 300 ? 'speaking' : 'ended';
      return;
    }
  }
  if (_aiCalls[callControlId]) _aiCalls[callControlId].status = 'timeout';
}

app.get('/api/phone/call-status/:id', requireAuth, (req, res) => {
  const info = _aiCalls[req.params.id];
  if (!info) return res.json({ status: 'unknown' });
  res.json(info);
});

// ─── Demo call ────────────────────────────────────────────────────────────────

app.post('/api/phone/demo-call', requireAuth, async (req, res) => {
  const from = process.env.TELNYX_FROM_NUMBER;
  if (!from) return res.status(400).json({ error: 'No phone number configured' });

  const conversation = [
    { side: 'caller',   voice: VOICES.male,   text: "Hey Sarah, it's James. Do you have a minute to go over the Q2 project timeline?" },
    { side: 'receiver', voice: VOICES.female, text: "Of course James! I was just reviewing the schedule. Are we still on track for April?" },
    { side: 'caller',   voice: VOICES.male,   text: "That's actually what I'm calling about — the dev team flagged a potential two-week slip on the backend API integration." },
    { side: 'receiver', voice: VOICES.female, text: "Two weeks? That's going to be tight with the client demo. What's causing the hold-up?" },
    { side: 'caller',   voice: VOICES.male,   text: "Incomplete vendor documentation. We've been going back and forth with their support team trying to get the final specs." },
    { side: 'receiver', voice: VOICES.female, text: "Understood. I'll talk to the PM about moving Marcus over to help unblock it. Can you send me a status update by end of day?" },
    { side: 'caller',   voice: VOICES.male,   text: "Absolutely — you'll have it by five. Thanks for jumping on this so quickly, Sarah." },
    { side: 'receiver', voice: VOICES.female, text: "Always, James. Let's get this across the line. Talk soon!" },
  ];

  res.json({ ok: true, message: 'Demo call starting — check /api/recordings in ~2 minutes for the result.' });

  const _demoCallRecordingWaiters = _demoStatus._recordingWaiters || (_demoStatus._recordingWaiters = {});
  _demoStatus.steps = []; _demoStatus.running = true;
  try {
    demoLog('step1: arming inbound capture');
    _pendingDemo.active = true;
    const inboundPromise = new Promise(resolve => {
      _pendingDemo.resolve = resolve;
      setTimeout(() => { _pendingDemo.active = false; resolve(null); }, 25000);
    });

    demoLog('step2: dialing ' + from);
    const callResp = await telnyxRest('POST', '/calls', { to: from, from, connection_id: '2911967655273432744' });
    demoLog('step2 response: ' + callResp.status);
    if (callResp.status !== 200 && callResp.status !== 201) { _pendingDemo.active = false; demoLog('step2 FAILED'); _demoStatus.running = false; return; }
    const outCCID = callResp.body?.data?.call_control_id;
    if (!outCCID) { _pendingDemo.active = false; demoLog('step2 no CCID'); _demoStatus.running = false; return; }
    demoLog('step2 outCCID: ' + outCCID.slice(-12));

    demoLog('step4: waiting for inbound leg...');
    const inCCID = await inboundPromise;
    if (!inCCID) {
      await telnyxRest('POST', `/calls/${outCCID}/actions/hangup`, {}).catch(() => {});
      demoLog('step4 TIMEOUT');
      _demoStatus.running = false; return;
    }
    demoLog('step4 inCCID: ' + inCCID.slice(-12));

    demoLog('step5: waiting for outbound to answer...');
    await new Promise(resolve => { _answeredWaiters[outCCID] = resolve; setTimeout(resolve, 15000); });
    demoLog('step5 outbound answered');

    demoLog('step6: starting dual-channel recording');
    await telnyxRest('POST', `/calls/${outCCID}/actions/record_stop`, {}).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    const recR = await telnyxRest('POST', `/calls/${outCCID}/actions/record_start`, { format: 'wav', channels: 'dual' });
    demoLog('step6 record_start: ' + recR.status);
    const recPromise = new Promise(resolve => {
      _demoCallRecordingWaiters[outCCID] = resolve;
      setTimeout(() => { delete _demoCallRecordingWaiters[outCCID]; resolve(null); }, 120000);
    });

    demoLog('step7: starting conversation (' + conversation.length + ' lines)');
    for (let i = 0; i < conversation.length; i++) {
      const line = conversation[i];
      const ccid = line.side === 'caller' ? outCCID : inCCID;
      demoLog(`line${i+1}/${conversation.length} (${line.side}): ${line.text.slice(0,40)}`);
      const r = await telnyxRest('POST', `/calls/${ccid}/actions/speak`, {
        payload: ttsPayload(line.text), payload_type: 'ssml', voice: line.voice, language: 'en-US', service_level: 'premium',
      }).catch(e => ({ status: 500 }));
      demoLog(`line${i+1} speak status: ${r.status}`);
      await new Promise(r => setTimeout(r, 12000));
      demoLog(`line${i+1} done`);
    }

    demoLog('step8: stopping recording + hangup');
    await telnyxRest('POST', `/calls/${outCCID}/actions/record_stop`, {}).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    await telnyxRest('POST', `/calls/${outCCID}/actions/hangup`, {}).catch(() => {});
    await telnyxRest('POST', `/calls/${inCCID}/actions/hangup`, {}).catch(() => {});
    demoLog('step8 done');

    recPromise.then(recUrls => { demoLog('step9 recording saved: ' + (recUrls ? JSON.stringify(recUrls) : 'TIMEOUT')); });
    _demoStatus.running = false;
  } catch (e) {
    demoLog('EXCEPTION: ' + e.message);
    _pendingDemo.active = false;
    _demoStatus.running = false;
  }
});

// ─── Routes: JaaS JWT ─────────────────────────────────────────────────────────

const JAAS_APP_ID  = 'vpaas-magic-cookie-e866a734fd5742ea83b9df9d3fab8807';
const JAAS_KEY_ID  = JAAS_APP_ID + '/740abb';
const JAAS_PRIVATE_KEY = (() => {
  if (process.env.JAAS_PRIVATE_KEY) return process.env.JAAS_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (process.env.JAAS_PRIVATE_KEY_B64) return Buffer.from(process.env.JAAS_PRIVATE_KEY_B64, 'base64').toString('utf8');
  try { return fs.readFileSync(path.join(__dirname, '..', '..', 'jitsi-jaas', 'jaas_private_key.pk'), 'utf8'); }
  catch (_) { return null; }
})();

app.get('/api/meetings/jaas-token', requireAuth, (req, res) => {
  if (!JAAS_PRIVATE_KEY) return res.json({ token: null, appId: null, fallback: 'meet.jit.si' });
  const room = req.query.room || '*';
  const user = req.user;
  const now  = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'chat', iat: now, exp: now + 7200, nbf: now - 10, aud: 'jitsi', sub: JAAS_APP_ID, room,
    context: {
      user: { id: String(user.user_id), name: user.name || user.email, email: user.email, avatar: '', moderator: 'true' },
      features: { livestreaming: 'false', recording: 'false', transcription: 'false', 'outbound-call': 'false' },
    },
  };
  const token = jwt.sign(payload, JAAS_PRIVATE_KEY, { algorithm: 'RS256', header: { alg: 'RS256', kid: JAAS_KEY_ID, typ: 'JWT' } });
  res.json({ token, appId: JAAS_APP_ID });
});

// ─── Routes: Device prefs ─────────────────────────────────────────────────────

app.get('/api/prefs', (req, res) => {
  const fp = (req.query.fp || '').trim();
  if (!fp) return res.json({});
  res.json(devicePrefsOps.get(fp) || {});
});

app.post('/api/prefs', (req, res) => {
  const fp = (req.body.fingerprint || '').trim();
  if (!fp) return res.status(400).json({ error: 'fingerprint required' });
  const result = devicePrefsOps.set(fp, req.body);
  res.json(result || {});
});

// Also support /api/device-prefs
app.get('/api/device-prefs', requireAuth, (req, res) => {
  const fp = (req.query.fp || req.query.fingerprint || '').trim();
  if (!fp) return res.json({});
  res.json(devicePrefsOps.get(fp) || {});
});

app.post('/api/device-prefs', requireAuth, (req, res) => {
  const fp = (req.body.fingerprint || '').trim();
  if (!fp) return res.status(400).json({ error: 'fingerprint required' });
  const result = devicePrefsOps.set(fp, req.body);
  res.json(result || {});
});

// ─── Routes: Meetings ─────────────────────────────────────────────────────────

app.get('/api/meetings', requireAuth, (req, res) => {
  res.json(meetingOps.list(req.user.user_id));
});

app.get('/api/meetings/:id', requireAuth, (req, res) => {
  const m = meetingOps.findById(req.params.id, req.user.user_id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

app.post('/api/meetings', requireAuth, (req, res) => {
  const id = meetingOps.create(req.user.user_id, { ...req.body, host_name: req.user.name });
  res.json({ ok: true, id, meeting: meetingOps.findById(id, req.user.user_id) });
});

app.patch('/api/meetings/:id', requireAuth, (req, res) => {
  meetingOps.update(req.params.id, req.user.user_id, req.body);
  res.json({ ok: true });
});

app.delete('/api/meetings/:id', requireAuth, (req, res) => {
  meetingOps.delete(req.params.id, req.user.user_id);
  res.json({ ok: true });
});

app.get('/api/meetings/join/:code', (req, res) => {
  const m = meetingOps.findByCode(req.params.code);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ id: m.id, title: m.title, host_name: m.host_name, scheduled_at: m.scheduled_at, duration_min: m.duration_min, status: m.status });
});

// ─── Routes: AI (phone-only) ──────────────────────────────────────────────────

app.post('/api/ai/ask', requireAuth, requireAI, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const response = await ai.ask(
      'You are a helpful phone system assistant.',
      message
    );
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/translate', requireAuth, requireAI, async (req, res) => {
  const { message, text } = req.body;
  const input = message || text;
  if (!input) return res.status(400).json({ error: 'message required' });
  try {
    const response = await ai.ask(
      'You are a translation assistant.',
      input
    );
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes: Recordings ───────────────────────────────────────────────────────

app.get('/api/recordings', requireAuth, (req, res) => {
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  const own = recordingOps.listByUser(req.user.user_id);
  const phoneOwner = phoneUserId !== req.user.user_id ? recordingOps.listByUser(phoneUserId) : [];
  const seen = new Set(own.map(r => r.id));
  const merged = [...own, ...phoneOwner.filter(r => !seen.has(r.id))];
  merged.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  res.json({ recordings: merged });
});

app.get('/api/recordings/:id', requireAuth, (req, res) => {
  const rec = recordingOps.getById(req.params.id);
  const phoneUserId = getPhoneOwnerUserId(req.user.user_id);
  if (!rec || (rec.user_id !== req.user.user_id && rec.user_id !== phoneUserId)) return res.status(404).json({ error: 'Not found' });
  res.json(rec);
});

app.patch('/api/recordings/:id', requireAuth, (req, res) => {
  const rec = recordingOps.getById(req.params.id);
  if (!rec || rec.user_id !== req.user.user_id) return res.status(404).json({ error: 'Not found' });
  recordingOps.update(req.params.id, req.user.user_id, req.body);
  res.json({ ok: true });
});

app.delete('/api/recordings/:id', requireAuth, (req, res) => {
  const deleted = recordingOps.delete(req.params.id, req.user.user_id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  const filepath = path.join(uploadsDir, deleted.filename);
  fs.unlink(filepath, () => {});
  res.json({ ok: true });
});

app.get('/api/recordings/:id/stream', (req, res) => {
  const sessionToken = req.cookies.session || req.query.token;
  const session = sessionToken ? db.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')`).get(sessionToken) : null;
  if (!session) return res.status(401).end();
  const rec = recordingOps.getById(req.params.id);
  const phoneUserId = getPhoneOwnerUserId(session.user_id);
  if (!rec || (rec.user_id !== session.user_id && rec.user_id !== phoneUserId)) return res.status(404).end();
  streamVideo(rec, req, res);
});

app.get('/api/recordings/:id/comments', (req, res) => {
  const rec = recordingOps.getById(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  if (!rec.is_public) {
    const token = req.cookies.session || req.headers['x-session'];
    const session = token ? db.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')`).get(token) : null;
    if (!session || session.user_id !== rec.user_id) return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(recordingCommentOps.list(req.params.id));
});

app.post('/api/recordings/:id/comments', (req, res) => {
  const rec = recordingOps.getById(req.params.id);
  if (!rec || !rec.is_public) return res.status(404).json({ error: 'Not found' });
  const { authorName, authorEmail, body, timestampSec } = req.body;
  if (!authorName || !body) return res.status(400).json({ error: 'authorName and body required' });
  const id = recordingCommentOps.add({ recordingId: req.params.id, authorName, authorEmail, body, timestampSec });
  res.json({ id });
});

function streamVideo(rec, req, res) {
  const filepath = path.join(uploadsDir, rec.filename);
  if (!fs.existsSync(filepath)) {
    if (rec.storage_url) return res.redirect(302, rec.storage_url);
    return res.status(404).end();
  }
  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(rec.filename).toLowerCase();
  const mime = ext === '.mp3' ? 'audio/mpeg' : ext === '.mp4' ? 'video/mp4' : ext === '.ogg' ? 'audio/ogg' : 'video/webm';
  res.setHeader('Content-Type', mime);
  res.setHeader('Accept-Ranges', 'bytes');
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunksize = end - start + 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Content-Length': chunksize });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize });
    fs.createReadStream(filepath).pipe(res);
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

const _pushTokens = {};

let _firebaseAdmin = null;
function getFirebaseAdmin() {
  if (_firebaseAdmin) return _firebaseAdmin;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa) });
      } else {
        const saPath = path.join(__dirname, 'firebase-service-account.json');
        if (fs.existsSync(saPath)) admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
      }
    }
    _firebaseAdmin = admin;
  } catch (e) { console.warn('[FCM] firebase-admin not available:', e.message); }
  return _firebaseAdmin;
}

let _webpush = null;
function getWebPush() {
  if (_webpush) return _webpush;
  try {
    _webpush = require('web-push');
    _webpush.setVapidDetails(
      'mailto:svet@stproperties.com',
      'BJWIfBkuXOz1k83sCsdCZx0UlhrcWAcB8QS9yqLi9AIxCuz5P9N7TWM21ytUlV_Ps-VgGIz-xBX7AZucjz22daY',
      't81X54rFNTyEJS9FPr2pH-1KtUF9sKKrgRiCYdGSiOQ'
    );
  } catch (e) { console.warn('[WebPush] web-push not available:', e.message); }
  return _webpush;
}

app.post('/api/push/register', requireAuth, (req, res) => {
  const uid = req.user.user_id;
  const { type, token, subscription } = req.body;
  if (!type || (!token && !subscription)) return res.status(400).json({ error: 'type + token or subscription required' });
  if (!_pushTokens[uid]) _pushTokens[uid] = [];
  const existing = _pushTokens[uid].find(t => t.type === type && (t.token === token || JSON.stringify(t.subscription) === JSON.stringify(subscription)));
  if (!existing) _pushTokens[uid].push({ type, token, subscription });
  res.json({ ok: true });
});

async function sendPushToUser(userId, payload) {
  const tokens = _pushTokens[userId] || [];
  if (!tokens.length) {
    for (const uid of Object.keys(_pushTokens)) await sendPushToUser(uid, payload);
    return;
  }
  const admin = getFirebaseAdmin();
  const webpush = getWebPush();
  for (const t of tokens) {
    try {
      if (t.type === 'fcm' && admin) {
        const isCall = payload.data?.type === 'incoming_call';
        await admin.messaging().send({
          token: t.token,
          notification: { title: payload.title, body: payload.body },
          android: { priority: 'high', ttl: isCall ? 30000 : 86400000, notification: { channelId: isCall ? 'incoming_calls' : 'default', priority: isCall ? 'max' : 'default', defaultVibrateTimings: true, defaultSound: true } },
          data: Object.fromEntries(Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])),
        });
      } else if (t.type === 'webpush' && webpush && t.subscription) {
        await webpush.sendNotification(t.subscription, JSON.stringify({ title: payload.title, body: payload.body, tag: payload.tag, vibrate: [300, 100, 300] }));
      }
    } catch (e) {
      console.warn(`[Push] Failed to send ${t.type}:`, e.message);
      if (e.code === 'messaging/registration-token-not-registered' || e.statusCode === 410) {
        _pushTokens[userId] = _pushTokens[userId].filter(x => x !== t);
      }
    }
  }
}

global._sendPushToUser = sendPushToUser;

// ─── Transcription service config ─────────────────────────────────────────────

let _transcriptionProvider = process.env.TRANSCRIPTION_PROVIDER || 'deepgram';

app.get('/api/transcription/config', requireAuth, (req, res) => {
  res.json({ provider: _transcriptionProvider });
});

app.post('/api/transcription/config', requireAuth, (req, res) => {
  const { provider } = req.body;
  if (!provider || !['browser', 'deepgram'].includes(provider)) {
    return res.status(400).json({ error: 'provider must be "browser" or "deepgram"' });
  }
  _transcriptionProvider = provider;
  console.log(`[Transcription] Provider switched to: ${provider}`);
  res.json({ ok: true, provider: _transcriptionProvider });
});

app.post('/api/transcription/token', requireAuth, (req, res) => {
  if (_transcriptionProvider !== 'deepgram') {
    return res.status(400).json({ error: 'Deepgram not active. Current provider: ' + _transcriptionProvider });
  }
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'DEEPGRAM_API_KEY not configured on server' });
  }
  res.json({ key });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/users', requireAuth, (req, res) => {
  res.json(userOps.list());
});

app.post('/api/admin/users', requireAuth, (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'email and name required' });
  try {
    const password = Math.random().toString(36).slice(2, 10);
    const user = userOps.create(email, password, name);
    res.json({ ok: true, user, tempPassword: password });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Phone Line Management (Admin) ────────────────────────────────────────────

app.get('/api/admin/phone-lines', requireAuth, (req, res) => {
  try {
    const lines = phoneOps.all(); // includes user email, name via JOIN
    res.json(lines);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/phone-lines', requireAuth, (req, res) => {
  const { user_id, phone_number, telnyx_cred_id, telnyx_sip_user } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const line = phoneOps.upsert(user_id, {
      phone_number: phone_number || null,
      telnyx_cred_id: telnyx_cred_id || null,
      telnyx_sip_user: telnyx_sip_user || null,
    });
    res.json(line);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/phone-lines/:id', requireAuth, (req, res) => {
  const { phone_number, telnyx_cred_id, telnyx_sip_user } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM phone_credentials WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    db.prepare('UPDATE phone_credentials SET phone_number=?, telnyx_cred_id=?, telnyx_sip_user=? WHERE id=?')
      .run(phone_number ?? existing.phone_number, telnyx_cred_id ?? existing.telnyx_cred_id, telnyx_sip_user ?? existing.telnyx_sip_user, req.params.id);
    res.json(db.prepare('SELECT pc.*, u.email, u.name FROM phone_credentials pc JOIN users u ON u.id = pc.user_id WHERE pc.id=?').get(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/phone-lines/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM phone_credentials WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fetch available Telnyx phone numbers and credential connections
app.get('/api/admin/telnyx-numbers', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey) return res.json({ numbers: [], connections: [] });

    const [numRes, connRes] = await Promise.all([
      fetch('https://api.telnyx.com/v2/phone_numbers?page%5Bsize%5D=50', {
        headers: { Authorization: `Bearer ${apiKey}` }
      }),
      fetch('https://api.telnyx.com/v2/credential_connections?page%5Bsize%5D=50', {
        headers: { Authorization: `Bearer ${apiKey}` }
      }),
    ]);

    const numData = await numRes.json();
    const connData = await connRes.json();

    const numbers = (numData.data || []).map(n => ({
      phone_number: n.phone_number,
      connection_id: n.connection_id,
      connection_name: n.connection_name,
      status: n.status,
    }));

    const connections = (connData.data || []).map(c => ({
      id: c.id,
      name: c.connection_name,
      active: c.active,
    }));

    // Also fetch telephony credentials
    const credRes = await fetch('https://api.telnyx.com/v2/telephony_credentials?page%5Bsize%5D=50', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const credData = await credRes.json();
    const credentials = (credData.data || []).map(c => ({
      id: c.id,
      name: c.name,
      sip_username: c.sip_username,
      resource_id: c.resource_id,
      status: c.status,
    }));

    res.json({ numbers, connections, credentials });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Phone Extensions (Phase 1-4 features) ───────────────────────────────────

require('./phone-extensions')(app, requireAuth, db, ai, telnyxRest, phoneOps, smsOps, callLogOps);

// ─── SPA fallback ─────────────────────────────────────────────────────────────

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

if (ensureAdminUser) ensureAdminUser();

// Auto-seed users (synchronous — must run before server accepts requests)
{
  try {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcrypt');
    const seeds = [
      { email: 'svet@stproperties.com', password: 'Partycard123*', name: 'Svet Pargov', oldEmail: 'hr@stproperties.com' },
      { email: 'line2@stproperties.com', password: 'Partycard123*', name: 'Line 2' },
    ];
    for (const s of seeds) {
      const hash = bcrypt.hashSync(s.password, 10);
      // Migrate old email → new email
      if (s.oldEmail) {
        const old = db.prepare('SELECT id FROM users WHERE email=?').get(s.oldEmail);
        if (old) {
          // Delete new email if it already exists (avoid unique constraint)
          db.prepare('DELETE FROM users WHERE email=? AND id!=?').run(s.email, old.id);
          db.prepare('UPDATE users SET email=?, password_hash=?, name=? WHERE id=?').run(s.email, hash, s.name, old.id);
          console.log(`[Seed] Migrated ${s.oldEmail} → ${s.email}`);
        }
      }
      const exists = db.prepare('SELECT id FROM users WHERE email=?').get(s.email);
      if (!exists) {
        userOps.create(s.email, s.password, s.name);
        console.log(`[Seed] Created user: ${s.email}`);
      } else {
        db.prepare('UPDATE users SET name=?, password_hash=? WHERE email=?').run(s.name, hash, s.email);
        console.log(`[Seed] Updated user: ${s.email}`);
      }
    }
    // Seed phone credential for admin user
    const fromNum = process.env.TELNYX_FROM_NUMBER;
    if (fromNum) {
      const adminUser = db.prepare('SELECT id FROM users WHERE email=?').get('svet@stproperties.com');
      if (adminUser) {
        const credExists = db.prepare('SELECT id FROM phone_credentials WHERE user_id=?').get(adminUser.id);
        if (!credExists) {
          db.prepare('INSERT OR IGNORE INTO phone_credentials (id,user_id,phone_number) VALUES (?,?,?)').run(uuidv4(), adminUser.id, fromNum);
          console.log(`[Seed] Phone credential seeded for ${fromNum}`);
        }
      }
    }
    // Seed phone credential for line2 user
    const line2User = db.prepare('SELECT id FROM users WHERE email=?').get('line2@stproperties.com');
    if (line2User) {
      const line2Cred = db.prepare('SELECT id FROM phone_credentials WHERE user_id=?').get(line2User.id);
      if (!line2Cred) {
        db.prepare('INSERT OR IGNORE INTO phone_credentials (id,user_id,phone_number,telnyx_cred_id,telnyx_sip_user) VALUES (?,?,?,?,?)')
          .run(uuidv4(), line2User.id, '+15144186797', 'cc5a2bdc-8fbf-414d-aec4-f0c541bc9904', 'line2');
        console.log('[Seed] Phone credential seeded for +15144186797 (Line 2)');
      }
    }
  } catch (e) { console.error('[Seed] Auto-seed failed:', e.message, e.stack); }
}

const httpServer = http.createServer(app);

// ── WebSocket upgrade routing (destroy unrecognized upgrades) ─────────────────

httpServer.on('upgrade', (req, socket) => {
  socket.destroy();
});

httpServer.listen(PORT, () => {
  console.log(`\n================================================`);
  console.log(`  S&T Phone running at http://localhost:${PORT}`);
  console.log(`  AI features: ${ai.isConfigured() ? 'ENABLED' : 'DISABLED (add ANTHROPIC_API_KEY)'}`);
  console.log(`  WebRTC token endpoint: /api/phone/webrtc-token`);
  console.log(`================================================\n`);
});

// Session cleanup every 60 minutes, delete sessions older than 30 days
setInterval(() => {
  if (sessionOps) sessionOps.cleanup();
}, 60 * 60 * 1000);

module.exports = app;
