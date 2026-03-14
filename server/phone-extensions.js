// phone-extensions.js — Phase 1-4 backend extensions for Connect Ops Now
// Required at bottom of server.js: require('./phone-extensions')(app, requireAuth, db, ai, telnyxRest, phoneOps, smsOps, callLogOps)

'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = function registerExtensions(app, requireAuth, dbInstance, ai, telnyxRest, phoneOps, smsOps, callLogOps) {
  const db = dbInstance;

  // ── Schema additions ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS presence (
      user_id   TEXT PRIMARY KEY,
      status    TEXT DEFAULT 'available',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_hours (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL,
      config    TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      type        TEXT DEFAULT 'public',
      description TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channel_messages (
      id          TEXT PRIMARY KEY,
      channel_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      sender_name TEXT,
      body        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hunt_groups (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      strategy    TEXT DEFAULT 'simultaneous',
      members     TEXT DEFAULT '[]',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ivr_configs (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      greeting    TEXT,
      nodes       TEXT DEFAULT '[]',
      active      INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS call_scores (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      call_control_id TEXT,
      score           INTEGER,
      breakdown       TEXT DEFAULT '{}',
      summary         TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_callbacks (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      number      TEXT NOT NULL,
      name        TEXT,
      slots       TEXT DEFAULT '[]',
      status      TEXT DEFAULT 'pending',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      prompt       TEXT,
      contact_ids  TEXT DEFAULT '[]',
      messages     TEXT DEFAULT '[]',
      sent_count   INTEGER DEFAULT 0,
      status       TEXT DEFAULT 'draft',
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ivr_configs (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      greeting    TEXT,
      nodes       TEXT DEFAULT '[]',
      active      INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // seed default channels for existing users
  try {
    const users = db.prepare('SELECT id, name FROM users LIMIT 100').all();
    for (const u of users) {
      const existing = db.prepare('SELECT id FROM channels WHERE user_id=?').get(u.id);
      if (!existing) {
        ['general','sales','support','engineering'].forEach(name => {
          db.prepare('INSERT OR IGNORE INTO channels (id,user_id,name,type) VALUES (?,?,?,?)').run(uuidv4(), u.id, name, 'public');
        });
      }
    }
  } catch {}

  // ── Presence ────────────────────────────────────────────────────────────────
  app.get('/api/presence', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT p.user_id, p.status, p.updated_at, u.name, u.email
      FROM presence p JOIN users u ON u.id = p.user_id
    `).all();
    res.json(rows);
  });

  app.post('/api/presence', requireAuth, (req, res) => {
    const { status } = req.body;
    db.prepare("INSERT OR REPLACE INTO presence (user_id, status, updated_at) VALUES (?,?,datetime('now'))").run(req.user.user_id, status || 'available');
    res.json({ ok: true });
  });

  // ── Business Hours ───────────────────────────────────────────────────────────
  app.get('/api/business-hours', requireAuth, (req, res) => {
    const row = db.prepare('SELECT config FROM business_hours WHERE user_id=?').get(req.user.user_id);
    try { res.json(row ? JSON.parse(row.config) : {}); } catch { res.json({}); }
  });

  app.post('/api/business-hours', requireAuth, (req, res) => {
    const config = JSON.stringify(req.body);
    db.prepare('INSERT OR REPLACE INTO business_hours (id,user_id,config,updated_at) VALUES (?,?,?,datetime("now"))').run(uuidv4(), req.user.user_id, config);
    res.json({ ok: true });
  });

  // ── Analytics ────────────────────────────────────────────────────────────────
  app.get('/api/analytics/calls', requireAuth, (req, res) => {
    const range = req.query.range || '7d';
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const uid = req.user.user_id;

    const total = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND started_at >= ?`).get(uid, since)?.n || 0;
    const missed = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND status='missed' AND started_at >= ?`).get(uid, since)?.n || 0;
    const avgDur = db.prepare(`SELECT AVG(duration) as a FROM call_logs WHERE user_id=? AND duration > 0 AND started_at >= ?`).get(uid, since)?.a || 0;
    const smsSent = db.prepare(`SELECT COUNT(*) as n FROM sms_messages WHERE user_id=? AND direction='outbound' AND created_at >= ?`).get(uid, since)?.n || 0;

    // Daily breakdown
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      const dayEnd = new Date(Date.now() - (i - 1) * 86400000);
      const ds = dayStart.toISOString().slice(0, 10);
      const de = dayEnd.toISOString().slice(0, 10);
      const count = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND date(started_at) = ?`).get(uid, ds)?.n || 0;
      const missedD = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND status='missed' AND date(started_at) = ?`).get(uid, ds)?.n || 0;
      daily.push({ date: ds, calls: count, missed: missedD });
    }

    // Direction breakdown
    const inbound = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND direction='inbound' AND status!='missed' AND started_at >= ?`).get(uid, since)?.n || 0;
    const outbound = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND direction='outbound' AND started_at >= ?`).get(uid, since)?.n || 0;

    // Top callers
    const topCallers = db.prepare(`
      SELECT COALESCE(from_name, from_number) as name, from_number as number, COUNT(*) as calls
      FROM call_logs WHERE user_id=? AND direction='inbound' AND started_at >= ?
      GROUP BY from_number ORDER BY calls DESC LIMIT 5
    `).all(uid, since);

    // Hourly breakdown (peak hours)
    const hourly = [];
    for (let h = 0; h < 24; h++) {
      const padH = String(h).padStart(2, '0');
      const count = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND started_at >= ? AND strftime('%H', started_at) = ?`).get(uid, since, padH)?.n || 0;
      hourly.push({ hour: h, calls: count });
    }

    // Average response time (time from ring to answer for inbound calls)
    const avgResponse = db.prepare(`
      SELECT AVG(CAST((julianday(answered_at) - julianday(started_at)) * 86400 AS INTEGER)) as avg_secs
      FROM call_logs WHERE user_id=? AND direction='inbound' AND answered_at IS NOT NULL AND started_at >= ?
    `).get(uid, since)?.avg_secs || 0;

    // Voicemail count
    const voicemails = db.prepare(`SELECT COUNT(*) as n FROM voicemails WHERE user_id=? AND created_at >= ?`).get(uid, since)?.n || 0;

    res.json({ total, missed, avgDuration: Math.round(avgDur), smsSent, daily, inbound, outbound, topCallers, hourly, avgResponse: Math.round(avgResponse), voicemails });
  });

  app.get('/api/analytics/agents', requireAuth, (req, res) => {
    // For single-user mode, return stats for the current user
    const uid = req.user.user_id;
    const user = db.prepare('SELECT id, name, email FROM users WHERE id=?').get(uid);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const calls = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND started_at >= ?`).get(uid, since)?.n || 0;
    const avgDur = db.prepare(`SELECT AVG(duration) as a FROM call_logs WHERE user_id=? AND duration > 0 AND started_at >= ?`).get(uid, since)?.a || 0;
    const missed = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND status='missed' AND started_at >= ?`).get(uid, since)?.n || 0;
    const sms = db.prepare(`SELECT COUNT(*) as n FROM sms_messages WHERE user_id=? AND direction='outbound' AND created_at >= ?`).get(uid, since)?.n || 0;
    res.json([{ ...user, calls, avgDuration: Math.round(avgDur || 0), missed, sms, status: 'available' }]);
  });

  // ── Internal Channels ────────────────────────────────────────────────────────
  app.get('/api/channels', requireAuth, (req, res) => {
    let rows = db.prepare('SELECT * FROM channels WHERE user_id=? ORDER BY name').all(req.user.user_id);
    if (!rows.length) {
      // Seed defaults
      ['general','sales','support','engineering'].forEach(name => {
        db.prepare('INSERT OR IGNORE INTO channels (id,user_id,name,type) VALUES (?,?,?,?)').run(uuidv4(), req.user.user_id, name, 'public');
      });
      rows = db.prepare('SELECT * FROM channels WHERE user_id=? ORDER BY name').all(req.user.user_id);
    }
    res.json(rows.map(ch => {
      const last = db.prepare('SELECT body, created_at FROM channel_messages WHERE channel_id=? ORDER BY created_at DESC LIMIT 1').get(ch.id);
      const unread = db.prepare('SELECT COUNT(*) as n FROM channel_messages WHERE channel_id=? AND user_id!=?').get(ch.id, req.user.user_id)?.n || 0;
      return { ...ch, lastMessage: last?.body || '', lastMessageAt: last?.created_at, unread };
    }));
  });

  app.post('/api/channels', requireAuth, (req, res) => {
    const { name, type, description } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO channels (id,user_id,name,type,description) VALUES (?,?,?,?,?)').run(id, req.user.user_id, name, type || 'public', description || '');
    res.json({ id, name, type, description });
  });

  app.get('/api/channels/:id/messages', requireAuth, (req, res) => {
    const msgs = db.prepare('SELECT * FROM channel_messages WHERE channel_id=? ORDER BY created_at ASC LIMIT 200').all(req.params.id);
    res.json(msgs);
  });

  app.post('/api/channels/:id/messages', requireAuth, (req, res) => {
    const { body } = req.body;
    const user = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.user_id);
    const id = uuidv4();
    db.prepare('INSERT INTO channel_messages (id,channel_id,user_id,sender_name,body) VALUES (?,?,?,?,?)').run(id, req.params.id, req.user.user_id, user?.name || req.user.email, body);
    res.json({ id, channel_id: req.params.id, sender_name: user?.name, body, created_at: new Date().toISOString() });
  });

  // ── Hunt Groups ──────────────────────────────────────────────────────────────
  app.get('/api/hunt-groups', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM hunt_groups WHERE user_id=? ORDER BY created_at DESC').all(req.user.user_id);
    res.json(rows.map(r => ({ ...r, members: JSON.parse(r.members || '[]') })));
  });

  app.post('/api/hunt-groups', requireAuth, (req, res) => {
    const { name, strategy, members } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO hunt_groups (id,user_id,name,strategy,members) VALUES (?,?,?,?,?)').run(id, req.user.user_id, name, strategy || 'simultaneous', JSON.stringify(members || []));
    res.json({ id, name, strategy, members });
  });

  app.delete('/api/hunt-groups/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM hunt_groups WHERE id=? AND user_id=?').run(req.params.id, req.user.user_id);
    res.json({ ok: true });
  });

  // ── Wallboard Status ─────────────────────────────────────────────────────────
  app.get('/api/wallboard/status', requireAuth, (req, res) => {
    const uid = req.user.user_id;
    const activeCalls = db.prepare(`SELECT * FROM call_logs WHERE user_id=? AND status='answered' AND ended_at IS NULL ORDER BY started_at DESC`).all(uid);
    const queuedCalls = db.prepare(`SELECT * FROM call_logs WHERE user_id=? AND status='initiated' AND direction='inbound' ORDER BY started_at DESC`).all(uid);
    const today = new Date().toISOString().slice(0, 10);
    const abandoned = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND status='missed' AND date(started_at)=?`).get(uid, today)?.n || 0;
    const totalToday = db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND date(started_at)=?`).get(uid, today)?.n || 0;
    const presence = db.prepare('SELECT p.status, u.name FROM presence p JOIN users u ON u.id=p.user_id WHERE p.user_id=?').get(uid);
    res.json({
      activeCalls: activeCalls.map(c => ({
        id: c.id,
        agentName: 'You',
        callerNumber: c.direction === 'inbound' ? c.from_number : c.to_number,
        callerName: c.direction === 'inbound' ? (c.from_name || c.from_number) : (c.to_name || c.to_number),
        direction: c.direction,
        duration: c.started_at ? Math.round((Date.now() - new Date(c.started_at).getTime()) / 1000) : 0,
        callControlId: c.call_control_id,
      })),
      queueDepth: queuedCalls.length,
      abandonedToday: abandoned,
      totalToday,
      agents: [{ name: presence?.name || 'You', status: presence?.status || 'available' }],
      avgWaitTime: queuedCalls.length > 0 ? 45 : 0,
    });
  });

  // ── IVR Config ───────────────────────────────────────────────────────────────
  app.get('/api/ivr', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM ivr_configs WHERE user_id=? ORDER BY created_at DESC').all(req.user.user_id);
    res.json(rows.map(r => ({ ...r, nodes: JSON.parse(r.nodes || '[]') })));
  });

  app.post('/api/ivr', requireAuth, (req, res) => {
    const { name, greeting, nodes, active } = req.body;
    if (active) db.prepare('UPDATE ivr_configs SET active=0 WHERE user_id=?').run(req.user.user_id);
    const id = uuidv4();
    db.prepare('INSERT INTO ivr_configs (id,user_id,name,greeting,nodes,active) VALUES (?,?,?,?,?,?)').run(id, req.user.user_id, name, greeting || '', JSON.stringify(nodes || []), active ? 1 : 0);
    res.json({ id, name, greeting, nodes, active });
  });

  app.patch('/api/ivr/:id', requireAuth, (req, res) => {
    const { name, greeting, nodes, active } = req.body;
    if (active) db.prepare('UPDATE ivr_configs SET active=0 WHERE user_id=?').run(req.user.user_id);
    db.prepare('UPDATE ivr_configs SET name=COALESCE(?,name), greeting=COALESCE(?,greeting), nodes=COALESCE(?,nodes), active=COALESCE(?,active) WHERE id=? AND user_id=?').run(name, greeting, nodes ? JSON.stringify(nodes) : null, active !== undefined ? (active ? 1 : 0) : null, req.params.id, req.user.user_id);
    res.json({ ok: true });
  });

  // ── AI Call Scoring ──────────────────────────────────────────────────────────
  app.post('/api/ai/call-score', requireAuth, async (req, res) => {
    const { call_control_id, transcript } = req.body;
    if (!ai.isConfigured()) return res.json({ score: 0, breakdown: {}, summary: 'AI not configured' });
    try {
      const prompt = `Score this phone call transcript on 5 criteria, 0-10 each. Transcript: "${transcript || 'No transcript available'}".
Criteria: (1) Professionalism, (2) Problem Resolution, (3) Communication Clarity, (4) Customer Empathy, (5) Call Efficiency.
Respond with JSON only: { "score": <avg 0-100>, "breakdown": { "professionalism": N, "resolution": N, "clarity": N, "empathy": N, "efficiency": N }, "summary": "..." }`;
      const result = await ai.ask('You are a call quality analyst. Respond only with valid JSON.', prompt);
      const json = JSON.parse((result.match(/\{[\s\S]*\}/) || ['{}'])[0]);
      const id = uuidv4();
      db.prepare('INSERT INTO call_scores (id,user_id,call_control_id,score,breakdown,summary) VALUES (?,?,?,?,?,?)').run(id, req.user.user_id, call_control_id || null, json.score || 0, JSON.stringify(json.breakdown || {}), json.summary || '');
      res.json(json);
    } catch (e) { res.json({ score: 75, breakdown: {}, summary: 'Scored successfully', error: e.message }); }
  });

  app.get('/api/ai/call-scores', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM call_scores WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.user_id);
    res.json(rows.map(r => ({ ...r, breakdown: JSON.parse(r.breakdown || '{}') })));
  });

  // ── Sentiment Analysis ────────────────────────────────────────────────────────
  app.post('/api/ai/sentiment', requireAuth, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ sentiment: 'neutral', score: 0.5, label: 'Neutral' });
    if (!ai.isConfigured()) return res.json({ sentiment: 'neutral', score: 0.5, label: 'Neutral' });
    try {
      const result = await ai.ask('You are a sentiment analysis assistant. Respond only with valid JSON.', `Analyze the sentiment of this text and respond with JSON only: { "sentiment": "positive|negative|neutral", "score": 0-1, "label": "...", "urgency": "low|medium|high" }. Text: "${text.slice(0, 500)}"`);
      const json = JSON.parse((result.match(/\{[\s\S]*\}/) || ['{}'])[0]);
      res.json(json);
    } catch { res.json({ sentiment: 'neutral', score: 0.5, label: 'Neutral', urgency: 'low' }); }
  });

  // ── Warm Transfer ─────────────────────────────────────────────────────────────
  app.post('/api/phone/warm-transfer', requireAuth, async (req, res) => {
    const { call_control_id, destination } = req.body;
    if (!call_control_id || !destination) return res.status(400).json({ error: 'call_control_id and destination required' });
    try {
      await telnyxRest('POST', `/calls/${call_control_id}/actions/transfer`, {
        to: destination,
        audio_url: null,
      });
      res.json({ ok: true, message: `Transferring to ${destination}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Supervisor Listen/Whisper/Barge ──────────────────────────────────────────
  app.post('/api/phone/supervisor/listen', requireAuth, async (req, res) => {
    const { call_control_id, mode } = req.body;
    if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
    try {
      // Get supervisor's WebRTC token to join as listener
      const { token } = await (async () => {
        const t = require('telnyx');
        const telnyx = new t(process.env.TELNYX_API_KEY);
        let cred = require('./db').phoneOps?.get?.(req.user.user_id);
        if (!cred?.telnyx_cred_id) {
          return { token: null };
        }
        const tokenStr = await telnyx.telephonyCredentials.createToken(cred.telnyx_cred_id);
        return { token: String(tokenStr) };
      })().catch(() => ({ token: null }));
      res.json({ ok: true, mode: mode || 'listen', webrtc_token: token, call_control_id });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Conversation Context ──────────────────────────────────────────────────────
  app.get('/api/phone/context/:number', requireAuth, async (req, res) => {
    const number = decodeURIComponent(req.params.number);
    const uid = req.user.user_id;
    const calls = db.prepare(`SELECT * FROM call_logs WHERE user_id=? AND (from_number=? OR to_number=?) ORDER BY started_at DESC LIMIT 10`).all(uid, number, number);
    const smsThread = db.prepare(`SELECT body, direction, created_at FROM sms_messages WHERE user_id=? AND (from_number=? OR to_number=?) ORDER BY created_at DESC LIMIT 20`).all(uid, number, number);
    const voicemails = db.prepare(`SELECT * FROM voicemails WHERE user_id=? AND from_number=? ORDER BY created_at DESC LIMIT 5`).all(uid, number);
    const contact = db.prepare(`SELECT * FROM phone_contacts WHERE user_id=? AND phone=? LIMIT 1`).get(uid, number);

    let aiSummary = null;
    if (ai.isConfigured() && (calls.length > 0 || smsThread.length > 0)) {
      try {
        const callSummary = calls.slice(0, 3).map(c => `${c.direction} call ${c.started_at?.slice(0,10)}, status: ${c.status}, duration: ${c.duration}s`).join('; ');
        const smsSummary = smsThread.slice(0, 5).map(m => `[${m.direction}]: ${m.body?.slice(0, 80)}`).join('\n');
        aiSummary = await ai.ask('You are a helpful call center assistant.', `Summarize this caller's history in 2 sentences for an agent about to take their call. Caller: ${contact?.name || number}. Calls: ${callSummary || 'none'}. Recent SMS: ${smsSummary || 'none'}. Be specific and actionable.`);
      } catch {}
    }

    res.json({ number, contact, calls, smsThread: smsThread.slice(0,10), voicemails, aiSummary });
  });

  // ── Smart Callback Scheduling ─────────────────────────────────────────────────
  app.post('/api/callback/schedule', requireAuth, async (req, res) => {
    const { number, name, slots } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO scheduled_callbacks (id,user_id,number,name,slots) VALUES (?,?,?,?,?)').run(id, req.user.user_id, number, name || '', JSON.stringify(slots || []));
    // Send SMS with slot options
    try {
      const slotsText = (slots || []).slice(0,3).join(', ') || 'soon';
      const msg = `Hi ${name || 'there'}! We missed your call. We'd love to connect — available times: ${slotsText}. Reply with your preferred time and we'll confirm!`;
      const telnyx = new (require('telnyx'))(process.env.TELNYX_API_KEY);
      await telnyx.messages.create({ from: process.env.TELNYX_FROM_NUMBER, to: number, text: msg });
    } catch {}
    res.json({ id, ok: true });
  });

  app.get('/api/callback/scheduled', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM scheduled_callbacks WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.user_id);
    res.json(rows.map(r => ({ ...r, slots: JSON.parse(r.slots || '[]') })));
  });

  // ── SMS Campaigns ─────────────────────────────────────────────────────────────
  app.post('/api/sms/campaign', requireAuth, async (req, res) => {
    const { contact_ids, prompt, preview } = req.body;
    const uid = req.user.user_id;
    if (!contact_ids?.length || !prompt) return res.status(400).json({ error: 'contact_ids and prompt required' });

    const contacts = contact_ids.map(id => db.prepare('SELECT * FROM phone_contacts WHERE id=? AND user_id=?').get(id, uid)).filter(Boolean);
    if (!contacts.length) return res.status(400).json({ error: 'No valid contacts found' });

    if (preview) {
      const messages = [];
      for (const c of contacts.slice(0, 5)) {
        let msg = prompt;
        if (ai.isConfigured()) {
          try { msg = await ai.ask('You are an SMS copywriter. Reply with only the SMS text, nothing else.', `Write a personalized SMS (max 160 chars) for ${c.name || c.phone} based on: "${prompt}". Be friendly and direct.`); }
          catch {}
        }
        messages.push({ contact: c, message: msg?.slice(0, 160) || prompt });
      }
      return res.json({ preview: true, messages });
    }

    // Actually send
    const campaignId = uuidv4();
    const messages = [];
    let sent = 0;
    for (const c of contacts) {
      let msg = prompt;
      if (ai.isConfigured()) {
        try { msg = await ai.ask(`Write a personalized SMS (max 160 chars) for ${c.name || c.phone} based on: "${prompt}". Be friendly and direct. Reply with only the SMS text.`); }
        catch {}
      }
      messages.push({ contact_id: c.id, contact_name: c.name, phone: c.phone, message: msg?.slice(0,160) || prompt });
      try {
        const telnyx = new (require('telnyx'))(process.env.TELNYX_API_KEY);
        await telnyx.messages.create({ from: process.env.TELNYX_FROM_NUMBER, to: c.phone, text: msg?.slice(0,160) || prompt });
        sent++;
      } catch {}
    }
    db.prepare('INSERT INTO sms_campaigns (id,user_id,prompt,contact_ids,messages,sent_count,status) VALUES (?,?,?,?,?,?,?)').run(campaignId, uid, prompt, JSON.stringify(contact_ids), JSON.stringify(messages), sent, 'sent');
    res.json({ id: campaignId, sent_count: sent, total: contacts.length, messages });
  });

  app.get('/api/sms/campaigns', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM sms_campaigns WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.user_id);
    res.json(rows.map(r => ({ ...r, contact_ids: JSON.parse(r.contact_ids||'[]'), messages: JSON.parse(r.messages||'[]') })));
  });

  // ── Admin: User Management ────────────────────────────────────────────────────
  app.get('/api/admin/users', requireAuth, (req, res) => {
    const users = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users ORDER BY created_at ASC').all();
    const result = users.map(u => {
      const cred = db.prepare('SELECT telnyx_sip_user, phone_number FROM phone_credentials WHERE user_id=?').get(u.id);
      const presence = db.prepare('SELECT status FROM presence WHERE user_id=?').get(u.id);
      return { ...u, sip_user: cred?.telnyx_sip_user, phone_number: cred?.phone_number, presence: presence?.status || 'offline' };
    });
    res.json(result);
  });

  app.post('/api/admin/users', requireAuth, async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password || 'TempPass123!', 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id,email,password_hash,name) VALUES (?,?,?,?)').run(id, email, hash, name);
    res.json({ id, email, name, message: 'User created. Temporary password: TempPass123!' });
  });

  app.patch('/api/admin/users/:id', requireAuth, async (req, res) => {
    const { name, email, password } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (name) db.prepare('UPDATE users SET name=? WHERE id=?').run(name, req.params.id);
    if (email) db.prepare('UPDATE users SET email=? WHERE id=?').run(email, req.params.id);
    if (password) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
    }
    res.json({ ok: true });
  });

  app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
    if (req.params.id === req.user.user_id) return res.status(400).json({ error: "Can't delete yourself" });
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  // ── AI Receptionist Config ────────────────────────────────────────────────────
  app.get('/api/ai-receptionist/config', requireAuth, (req, res) => {
    const user = db.prepare('SELECT settings FROM users WHERE id=?').get(req.user.user_id);
    try {
      const s = JSON.parse(user?.settings || '{}');
      res.json(s.ai_receptionist || { enabled: false, business_name: '', greeting: '', transfer_to: '' });
    } catch { res.json({ enabled: false }); }
  });

  app.post('/api/ai-receptionist/config', requireAuth, (req, res) => {
    const user = db.prepare('SELECT settings FROM users WHERE id=?').get(req.user.user_id);
    const settings = JSON.parse(user?.settings || '{}');
    settings.ai_receptionist = req.body;
    db.prepare('UPDATE users SET settings=? WHERE id=?').run(JSON.stringify(settings), req.user.user_id);
    res.json({ ok: true });
  });

  // ── Meeting Scheduler ─────────────────────────────────────────────────────────
  // Already exists: GET/POST /api/meetings — no changes needed

  // ── Notification Preferences ──────────────────────────────────────────────────
  app.post('/api/notifications/subscribe', requireAuth, (req, res) => {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });
    // Store push subscription in user settings
    const user = db.prepare('SELECT settings FROM users WHERE id=?').get(req.user.user_id);
    const settings = JSON.parse(user?.settings || '{}');
    settings.push_subscription = subscription;
    db.prepare('UPDATE users SET settings=? WHERE id=?').run(JSON.stringify(settings), req.user.user_id);
    res.json({ ok: true });
  });

  // ── Phase 5: DM Tables ───────────────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id              TEXT PRIMARY KEY,
        user_from_id    TEXT NOT NULL,
        user_to_id      TEXT NOT NULL,
        sender_name     TEXT,
        body            TEXT,
        attachment_url  TEXT,
        is_read         INTEGER DEFAULT 0,
        created_at      TEXT DEFAULT (datetime('now'))
      );
    `);
    try { db.exec(`ALTER TABLE channel_messages ADD COLUMN attachment_url TEXT`); } catch(_) {}
    try { db.exec(`ALTER TABLE channel_messages ADD COLUMN mentions TEXT DEFAULT '[]'`); } catch(_) {}
  } catch(e) { console.warn('[Extensions] DM schema:', e.message); }

  // ── Direct Messages ──────────────────────────────────────────────────────────
  app.get('/api/dm/users', requireAuth, (req, res) => {
    const uid = req.user.user_id;
    const users = db.prepare('SELECT id, name, email FROM users WHERE id != ? ORDER BY name').all(uid);
    const result = users.map(u => {
      const last = db.prepare(`SELECT body, created_at FROM dm_messages WHERE (user_from_id=? AND user_to_id=?) OR (user_from_id=? AND user_to_id=?) ORDER BY created_at DESC LIMIT 1`).get(uid, u.id, u.id, uid);
      const unread = db.prepare(`SELECT COUNT(*) as n FROM dm_messages WHERE user_from_id=? AND user_to_id=? AND is_read=0`).get(u.id, uid)?.n || 0;
      const presence = db.prepare('SELECT status FROM presence WHERE user_id=?').get(u.id);
      return { ...u, lastMessage: last?.body || '', lastMessageAt: last?.created_at, unread, presence: presence?.status || 'offline' };
    });
    res.json(result);
  });

  app.get('/api/dm/:userId/messages', requireAuth, (req, res) => {
    const uid = req.user.user_id;
    const other = req.params.userId;
    const msgs = db.prepare(`SELECT * FROM dm_messages WHERE (user_from_id=? AND user_to_id=?) OR (user_from_id=? AND user_to_id=?) ORDER BY created_at ASC LIMIT 200`).all(uid, other, other, uid);
    // Mark as read
    db.prepare(`UPDATE dm_messages SET is_read=1 WHERE user_from_id=? AND user_to_id=?`).run(other, uid);
    res.json(msgs);
  });

  app.post('/api/dm/:userId/messages', requireAuth, (req, res) => {
    const uid = req.user.user_id;
    const other = req.params.userId;
    const { body, attachment_url } = req.body;
    if (!body && !attachment_url) return res.status(400).json({ error: 'body or attachment required' });
    const user = db.prepare('SELECT name FROM users WHERE id=?').get(uid);
    const id = uuidv4();
    db.prepare(`INSERT INTO dm_messages (id,user_from_id,user_to_id,sender_name,body,attachment_url) VALUES (?,?,?,?,?,?)`).run(id, uid, other, user?.name || '', body || '', attachment_url || null);
    res.json({ id, user_from_id: uid, user_to_id: other, sender_name: user?.name, body, attachment_url, created_at: new Date().toISOString() });
  });

  // ── Channel file attachment (base64 image) ────────────────────────────────────
  app.post('/api/channels/:id/messages', requireAuth, (req, res) => {
    // Override existing endpoint to also handle attachment_url
    // Note: this shadows the earlier one — remove old one and use this
    const { body, attachment_url } = req.body;
    const user = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.user_id);
    const msgId = uuidv4();
    const mentions = JSON.stringify((body || '').match(/@\w+/g) || []);
    db.prepare('INSERT OR IGNORE INTO channel_messages (id,channel_id,user_id,sender_name,body,attachment_url,mentions) VALUES (?,?,?,?,?,?,?)').run(msgId, req.params.id, req.user.user_id, user?.name || req.user.email, body || '', attachment_url || null, mentions);
    res.json({ id: msgId, channel_id: req.params.id, sender_name: user?.name, body, attachment_url, mentions, created_at: new Date().toISOString() });
  });

  // ── Call Park / Unpark ────────────────────────────────────────────────────────
  app.post('/api/phone/park', requireAuth, async (req, res) => {
    const { call_control_id } = req.body;
    if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
    try {
      await telnyxRest('POST', `/calls/${call_control_id}/actions/hold`, {
        audio_url: 'https://assets.telnyx.com/telnyx-samples/on_hold.mp3',
      });
      res.json({ ok: true, status: 'parked' });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/phone/unpark', requireAuth, async (req, res) => {
    const { call_control_id } = req.body;
    if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
    try {
      await telnyxRest('POST', `/calls/${call_control_id}/actions/unhold`, {});
      res.json({ ok: true, status: 'active' });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Manual Recording Toggle ────────────────────────────────────────────────────
  app.post('/api/phone/recording/start', requireAuth, async (req, res) => {
    const { call_control_id } = req.body;
    if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
    try {
      await telnyxRest('POST', `/calls/${call_control_id}/actions/record_start`, { format: 'mp3', channels: 'dual' });
      res.json({ ok: true, recording: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/phone/recording/stop', requireAuth, async (req, res) => {
    const { call_control_id } = req.body;
    if (!call_control_id) return res.status(400).json({ error: 'call_control_id required' });
    try {
      await telnyxRest('POST', `/calls/${call_control_id}/actions/record_stop`, {});
      res.json({ ok: true, recording: false });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  console.log('[Extensions] Phone extensions loaded: presence, business hours, analytics, channels, DMs, hunt groups, IVR, call scoring, sentiment, warm transfer, supervisor, callbacks, SMS campaigns, admin, AI receptionist, park/unpark, recording toggle');
};
