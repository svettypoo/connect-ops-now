// db.js — SQLite database layer (phone-only) using better-sqlite3
'use strict';

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const path = require('path');

// Use /data volume if available (Railway persistent volume), else local file
const fs = require('fs');
const DB_PATH = process.env.DB_PATH ||
  (fs.existsSync('/data') ? '/data/phone.db' : path.join(__dirname, 'phone.db'));
const db = new Database(DB_PATH);

// Performance tuning
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA temp_store = MEMORY');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name        TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#0EA5E9',
    settings    TEXT DEFAULT '{}',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS phone_credentials (
    id              TEXT PRIMARY KEY,
    user_id         TEXT UNIQUE NOT NULL,
    telnyx_cred_id  TEXT,
    telnyx_sip_user TEXT,
    phone_number    TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recordings (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT DEFAULT 'Untitled Recording',
    filename    TEXT NOT NULL,
    duration    REAL DEFAULT 0,
    size        INTEGER DEFAULT 0,
    views       INTEGER DEFAULT 0,
    share_token TEXT UNIQUE NOT NULL,
    is_public   INTEGER DEFAULT 1,
    transcript  TEXT DEFAULT '',
    ai_summary  TEXT DEFAULT '',
    storage_url TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recording_comments (
    id            TEXT PRIMARY KEY,
    recording_id  TEXT NOT NULL,
    author_name   TEXT NOT NULL,
    author_email  TEXT,
    body          TEXT NOT NULL,
    timestamp_sec REAL DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_recordings_user  ON recordings(user_id);
  CREATE INDEX IF NOT EXISTS idx_recordings_token ON recordings(share_token);
  CREATE INDEX IF NOT EXISTS idx_rec_comments_rec ON recording_comments(recording_id);
`);

// Migrate recordings table columns
try {
  const cols = db.prepare("PRAGMA table_info(recordings)").all().map(c => c.name);
  if (!cols.includes('transcript'))  db.exec("ALTER TABLE recordings ADD COLUMN transcript TEXT DEFAULT ''");
  if (!cols.includes('ai_summary'))  db.exec("ALTER TABLE recordings ADD COLUMN ai_summary TEXT DEFAULT ''");
  if (!cols.includes('storage_url')) db.exec("ALTER TABLE recordings ADD COLUMN storage_url TEXT DEFAULT ''");
} catch {}

// ─── Meetings table ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    title        TEXT NOT NULL DEFAULT 'New Meeting',
    description  TEXT DEFAULT '',
    scheduled_at TEXT,
    duration_min INTEGER DEFAULT 60,
    status       TEXT DEFAULT 'scheduled',
    join_code    TEXT UNIQUE,
    host_name    TEXT,
    participants TEXT DEFAULT '[]',
    recording_id TEXT,
    notes        TEXT DEFAULT '',
    recurring    TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
  CREATE INDEX IF NOT EXISTS idx_meetings_code ON meetings(join_code);
`);
try { db.exec(`ALTER TABLE meetings ADD COLUMN recurring TEXT DEFAULT ''`); } catch {}

// ─── Phone contacts table ──────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS phone_contacts (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL,
  name     TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL DEFAULT '',
  phone    TEXT NOT NULL DEFAULT '',
  company  TEXT NOT NULL DEFAULT '',
  notes    TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

// ─── SMS messages table ────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS sms_messages (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  direction         TEXT NOT NULL,
  from_number       TEXT NOT NULL,
  to_number         TEXT NOT NULL,
  body              TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'delivered',
  is_read           INTEGER NOT NULL DEFAULT 0,
  telnyx_message_id TEXT DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);
try { db.exec('ALTER TABLE sms_messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0'); } catch {}

// ─── Voicemails table ─────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS voicemails (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  from_number   TEXT NOT NULL,
  from_name     TEXT NOT NULL DEFAULT '',
  duration      INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT NOT NULL DEFAULT '',
  transcript    TEXT NOT NULL DEFAULT '',
  ai_summary    TEXT NOT NULL DEFAULT '',
  filename      TEXT NOT NULL DEFAULT '',
  is_read       INTEGER NOT NULL DEFAULT 0,
  storage_url   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);
try { db.exec("ALTER TABLE voicemails ADD COLUMN filename TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE voicemails ADD COLUMN storage_url TEXT NOT NULL DEFAULT ''"); } catch {}

// ─── Call logs table ──────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS call_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  direction        TEXT NOT NULL DEFAULT 'outbound',
  from_number      TEXT NOT NULL DEFAULT '',
  to_number        TEXT NOT NULL DEFAULT '',
  from_name        TEXT NOT NULL DEFAULT '',
  to_name          TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'initiated',
  duration         INTEGER NOT NULL DEFAULT 0,
  call_control_id  TEXT DEFAULT '',
  recording_id     TEXT DEFAULT '',
  started_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  answered_at      TEXT DEFAULT NULL,
  ended_at         TEXT DEFAULT NULL,
  transcript       TEXT DEFAULT '',
  ai_summary       TEXT DEFAULT '',
  is_voicemail     INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);
try { db.exec(`ALTER TABLE call_logs ADD COLUMN transcript TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE call_logs ADD COLUMN ai_summary TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE call_logs ADD COLUMN is_voicemail INTEGER NOT NULL DEFAULT 0`); } catch {}

// ─── Call insights (post-call AI chips) ───────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS call_insights (
  id           TEXT PRIMARY KEY,
  call_log_id  TEXT,
  user_id      TEXT NOT NULL,
  tasks        TEXT NOT NULL DEFAULT '[]',
  email_draft  TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

// ─── Device preferences ───────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS device_prefs (
  fingerprint       TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL DEFAULT '',
  background_type   TEXT NOT NULL DEFAULT 'none',
  background_url    TEXT NOT NULL DEFAULT '',
  camera_device_id  TEXT NOT NULL DEFAULT '',
  mic_device_id     TEXT NOT NULL DEFAULT '',
  speaker_device_id TEXT NOT NULL DEFAULT '',
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJson(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function randomColor() {
  const colors = ['#0EA5E9', '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#EF4444'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ─── User operations ──────────────────────────────────────────────────────────

const userOps = {
  create(email, password, name) {
    const hash = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    const color = randomColor();
    db.prepare(`INSERT INTO users (id, email, password_hash, name, avatar_color) VALUES (?,?,?,?,?)`)
      .run(id, email.toLowerCase(), hash, name, color);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`SELECT id, email, name, avatar_color, settings, created_at FROM users WHERE id = ?`).get(id);
  },

  findByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
  },

  createFromZoho(email, name) {
    const id = uuidv4();
    const color = randomColor();
    db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, name, avatar_color) VALUES (?,?,?,?,?)`)
      .run(id, email.toLowerCase(), '', name, color);
    return this.findByEmail(email);
  },

  verify(email, password) {
    const user = this.findByEmail(email);
    if (!user) return null;
    if (!bcrypt.compareSync(password, user.password_hash)) return null;
    return { id: user.id, email: user.email, name: user.name, avatar_color: user.avatar_color, settings: user.settings };
  },

  updateSettings(userId, settings) {
    db.prepare(`UPDATE users SET settings = ? WHERE id = ?`).run(JSON.stringify(settings), userId);
  },

  updateProfile(userId, { name, email, password }) {
    if (name)     db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, userId);
    if (email)    db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(email, userId);
    if (password) db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(bcrypt.hashSync(password, 10), userId);
  },

  list() {
    return db.prepare(`SELECT id, email, name, avatar_color, created_at FROM users`).all();
  },
};

// ─── Session operations ────────────────────────────────────────────────────────

const sessionOps = {
  create(userId) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)`).run(id, userId, expiresAt);
    return id;
  },

  get(sessionId) {
    return db.prepare(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.avatar_color, u.settings
      FROM sessions s JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `).get(sessionId);
  },

  delete(sessionId) {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
  },

  cleanup() {
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  },
};

// ─── Contact operations (phone contacts only) ─────────────────────────────────

const contactOps = {
  phoneList(userId) {
    return db.prepare(`SELECT * FROM phone_contacts WHERE user_id = ? ORDER BY name ASC`).all(userId);
  },

  phoneSearch(userId, q) {
    return db.prepare(`SELECT * FROM phone_contacts WHERE user_id = ? AND (name LIKE ? OR phone LIKE ? OR company LIKE ?) ORDER BY name ASC LIMIT 50`)
      .all(userId, `%${q}%`, `%${q}%`, `%${q}%`);
  },

  phoneCreate(data) {
    const id = uuidv4();
    db.prepare(`INSERT INTO phone_contacts (id, user_id, name, email, phone, company, notes) VALUES (?,?,?,?,?,?,?)`)
      .run(id, data.user_id, data.name || '', data.email || '', data.phone || '', data.company || '', data.notes || '');
    return db.prepare(`SELECT * FROM phone_contacts WHERE id = ?`).get(id);
  },

  phoneUpdate(id, userId, data) {
    const allowed = ['name', 'email', 'phone', 'company', 'notes'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (data[k] !== undefined) { sets.push(`${k} = ?`); vals.push(data[k]); }
    }
    if (!sets.length) return;
    db.prepare(`UPDATE phone_contacts SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, id, userId);
  },

  phoneDelete(id, userId) {
    db.prepare(`DELETE FROM phone_contacts WHERE id = ? AND user_id = ?`).run(id, userId);
  },
};

// ─── Phone credential operations ──────────────────────────────────────────────

const phoneOps = {
  get(userId) {
    return db.prepare(`SELECT * FROM phone_credentials WHERE user_id = ?`).get(userId);
  },
  upsert(userId, { telnyx_cred_id, telnyx_sip_user, phone_number }) {
    const existing = this.get(userId);
    if (existing) {
      db.prepare(`UPDATE phone_credentials SET telnyx_cred_id=?, telnyx_sip_user=?, phone_number=? WHERE user_id=?`)
        .run(telnyx_cred_id || existing.telnyx_cred_id, telnyx_sip_user || existing.telnyx_sip_user, phone_number || existing.phone_number, userId);
    } else {
      db.prepare(`INSERT INTO phone_credentials (id, user_id, telnyx_cred_id, telnyx_sip_user, phone_number) VALUES (?,?,?,?,?)`)
        .run(uuidv4(), userId, telnyx_cred_id ?? null, telnyx_sip_user ?? null, phone_number ?? null);
    }
    return this.get(userId);
  },
  all() {
    return db.prepare(`SELECT pc.*, u.email, u.name FROM phone_credentials pc JOIN users u ON u.id = pc.user_id`).all();
  },
};

// ─── SMS operations ───────────────────────────────────────────────────────────

const smsOps = {
  create(msg) {
    const id = msg.id || require('crypto').randomUUID();
    db.prepare(`INSERT INTO sms_messages (id,user_id,direction,from_number,to_number,body,status,telnyx_message_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      id, msg.user_id, msg.direction, msg.from_number, msg.to_number,
      msg.body || '', msg.status || 'delivered', msg.telnyx_message_id || '',
      msg.created_at || new Date().toISOString()
    );
    return db.prepare('SELECT * FROM sms_messages WHERE id=?').get(id);
  },

  listThreads(userId) {
    return db.prepare(`
      SELECT
        CASE WHEN direction='outbound' THEN to_number ELSE from_number END as contact_number,
        MAX(created_at) as last_time,
        COUNT(*) as total,
        SUM(CASE WHEN direction='inbound' AND is_read=0 THEN 1 ELSE 0 END) as unread,
        (SELECT body FROM sms_messages s2
          WHERE s2.user_id=sms_messages.user_id
          AND (s2.from_number=CASE WHEN sms_messages.direction='outbound' THEN sms_messages.to_number ELSE sms_messages.from_number END
            OR s2.to_number=CASE WHEN sms_messages.direction='outbound' THEN sms_messages.to_number ELSE sms_messages.from_number END)
          ORDER BY s2.created_at DESC LIMIT 1) as last_body
      FROM sms_messages WHERE user_id=?
      GROUP BY contact_number ORDER BY last_time DESC
    `).all(userId);
  },

  listThread(userId, contactNumber) {
    return db.prepare(`SELECT * FROM sms_messages WHERE user_id=? AND (from_number=? OR to_number=?) ORDER BY created_at ASC`)
      .all(userId, contactNumber, contactNumber);
  },

  markThreadRead(userId, contactNumber) {
    db.prepare(`UPDATE sms_messages SET is_read=1 WHERE user_id=? AND direction='inbound' AND from_number=?`)
      .run(userId, contactNumber);
  },

  countUnread(userId) {
    if (userId) {
      return db.prepare(`SELECT COUNT(*) as n FROM sms_messages WHERE user_id=? AND direction='inbound' AND is_read=0`).get(userId).n;
    }
    return db.prepare(`SELECT COUNT(*) as n FROM sms_messages WHERE direction='inbound' AND is_read=0`).get().n;
  },
};

// ─── Voicemail operations ─────────────────────────────────────────────────────

const voicemailOps = {
  create(v) {
    const id = v.id || require('crypto').randomUUID();
    db.prepare(`INSERT INTO voicemails (id,user_id,from_number,from_name,duration,recording_url,transcript,ai_summary,filename,storage_url,is_read,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, v.user_id, v.from_number, v.from_name || '', v.duration || 0,
      v.recording_url || '', v.transcript || '', v.ai_summary || '', v.filename || '',
      v.storageUrl || '', 0, v.created_at || new Date().toISOString()
    );
    return db.prepare('SELECT * FROM voicemails WHERE id=?').get(id);
  },

  list(userId) {
    return db.prepare('SELECT * FROM voicemails WHERE user_id=? ORDER BY created_at DESC').all(userId);
  },

  markRead(id, userId) {
    db.prepare('UPDATE voicemails SET is_read=1 WHERE id=? AND user_id=?').run(id, userId);
  },

  countUnread(userId) {
    if (userId) {
      return db.prepare(`SELECT COUNT(*) as n FROM voicemails WHERE user_id=? AND is_read=0`).get(userId).n;
    }
    return db.prepare(`SELECT COUNT(*) as n FROM voicemails WHERE is_read=0`).get().n;
  },
};

// ─── Call log operations ──────────────────────────────────────────────────────

const callLogOps = {
  create(data) {
    const id = require('crypto').randomUUID();
    db.prepare(`INSERT INTO call_logs (id,user_id,direction,from_number,to_number,from_name,to_name,status,call_control_id,started_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, data.user_id, data.direction || 'outbound',
      data.from_number || '', data.to_number || '',
      data.from_name || '', data.to_name || '',
      data.status || 'initiated', data.call_control_id || '',
      data.started_at || new Date().toISOString()
    );
    return db.prepare('SELECT * FROM call_logs WHERE id=?').get(id);
  },

  list(userId, { limit = 50, filter } = {}) {
    let where = 'WHERE user_id=?';
    const params = [userId];
    if (filter === 'missed')   { where += " AND (status='missed' OR (duration=0 AND direction='inbound'))"; }
    else if (filter === 'incoming') { where += " AND direction='inbound'"; }
    else if (filter === 'outgoing') { where += " AND direction='outbound'"; }
    return db.prepare(`SELECT * FROM call_logs ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit);
  },

  findByCallControlId(ccid) {
    return db.prepare('SELECT * FROM call_logs WHERE call_control_id=?').get(ccid);
  },

  update(id, data) {
    const allowed = ['status', 'duration', 'answered_at', 'ended_at', 'recording_id', 'from_name', 'to_name', 'transcript', 'ai_summary', 'is_voicemail'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return;
    const set = fields.map(f => `${f}=?`).join(',');
    db.prepare(`UPDATE call_logs SET ${set} WHERE id=?`).run(...fields.map(f => data[f]), id);
  },

  count(userId) {
    if (userId) {
      return db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=?`).get(userId).n;
    }
    return db.prepare(`SELECT COUNT(*) as n FROM call_logs`).get().n;
  },

  countMissed(userId) {
    if (userId) {
      return db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE user_id=? AND status='missed'`).get(userId).n;
    }
    return db.prepare(`SELECT COUNT(*) as n FROM call_logs WHERE status='missed'`).get().n;
  },
};

// ─── Recording operations ──────────────────────────────────────────────────────

const recordingOps = {
  create({ userId, title, filename, duration, size, transcript, storageUrl }) {
    const id = uuidv4();
    const shareToken = require('crypto').randomBytes(16).toString('hex');
    db.prepare(`INSERT INTO recordings (id, user_id, title, filename, duration, size, share_token, transcript, storage_url)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, userId, (title || 'Untitled Recording').substring(0, 200), filename, duration || 0, size || 0, shareToken, transcript || '', storageUrl || '');
    return { id, shareToken };
  },

  listByUser(userId) {
    return db.prepare(`SELECT id, title, duration, size, views, share_token, is_public, transcript, ai_summary, storage_url, created_at
                       FROM recordings WHERE user_id = ? ORDER BY created_at DESC`).all(userId);
  },

  getById(id) {
    return db.prepare(`SELECT * FROM recordings WHERE id = ?`).get(id);
  },

  getByToken(token) {
    return db.prepare(`SELECT * FROM recordings WHERE share_token = ?`).get(token);
  },

  update(id, userId, data) {
    const allowed = ['title', 'is_public', 'transcript', 'ai_summary', 'storage_url'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (data[k] !== undefined) { sets.push(`${k} = ?`); vals.push(data[k]); }
    }
    if (!sets.length) return;
    db.prepare(`UPDATE recordings SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, id, userId);
  },

  delete(id, userId) {
    const rec = db.prepare(`SELECT filename FROM recordings WHERE id = ? AND user_id = ?`).get(id, userId);
    if (rec) db.prepare(`DELETE FROM recordings WHERE id = ?`).run(id);
    return rec;
  },

  incrementViews(id) {
    db.prepare(`UPDATE recordings SET views = views + 1 WHERE id = ?`).run(id);
  },
};

// ─── Recording comment operations ─────────────────────────────────────────────

const recordingCommentOps = {
  add({ recordingId, authorName, authorEmail, body, timestampSec }) {
    const id = uuidv4();
    db.prepare(`INSERT INTO recording_comments (id, recording_id, author_name, author_email, body, timestamp_sec)
                VALUES (?,?,?,?,?,?)`)
      .run(id, recordingId, authorName, authorEmail || null, body, timestampSec || 0);
    return id;
  },
  list(recordingId) {
    return db.prepare(`SELECT * FROM recording_comments WHERE recording_id = ? ORDER BY timestamp_sec ASC`)
      .all(recordingId);
  },
  delete(id) {
    db.prepare(`DELETE FROM recording_comments WHERE id = ?`).run(id);
  },
};

// ─── Meeting operations ────────────────────────────────────────────────────────

const meetingOps = {
  list(userId) {
    return db.prepare(`SELECT * FROM meetings WHERE user_id = ? ORDER BY scheduled_at DESC, created_at DESC`).all(userId).map(parseMeeting);
  },
  findById(id, userId) {
    const row = db.prepare(`SELECT * FROM meetings WHERE id = ? AND user_id = ?`).get(id, userId);
    return parseMeeting(row);
  },
  findByCode(code) {
    const row = db.prepare(`SELECT * FROM meetings WHERE join_code = ?`).get(code);
    return parseMeeting(row);
  },
  create(userId, data) {
    const id = uuidv4();
    const code = Math.random().toString(36).slice(2, 5) + '-' + Math.random().toString(36).slice(2, 5) + '-' + Math.random().toString(36).slice(2, 5);
    db.prepare(`INSERT INTO meetings (id, user_id, title, description, scheduled_at, duration_min, status, join_code, host_name, participants, notes, recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, userId,
      data.title || 'New Meeting',
      data.description || '',
      data.scheduled_at || null,
      data.duration_min || 60,
      data.status || 'scheduled',
      code,
      data.host_name || '',
      JSON.stringify(Array.isArray(data.participants) ? data.participants : []),
      data.notes || '',
      data.recurring || ''
    );
    return id;
  },
  update(id, userId, data) {
    const sets = [];
    const vals = [];
    if (data.title !== undefined)        { sets.push('title=?');        vals.push(data.title); }
    if (data.description !== undefined)  { sets.push('description=?');  vals.push(data.description); }
    if (data.scheduled_at !== undefined) { sets.push('scheduled_at=?'); vals.push(data.scheduled_at); }
    if (data.duration_min !== undefined) { sets.push('duration_min=?'); vals.push(data.duration_min); }
    if (data.status !== undefined)       { sets.push('status=?');       vals.push(data.status); }
    if (data.participants !== undefined) { sets.push('participants=?'); vals.push(JSON.stringify(data.participants)); }
    if (data.notes !== undefined)        { sets.push('notes=?');        vals.push(data.notes); }
    if (data.recurring !== undefined)    { sets.push('recurring=?');    vals.push(data.recurring); }
    if (data.recording_id !== undefined) { sets.push('recording_id=?'); vals.push(data.recording_id); }
    if (!sets.length) return;
    sets.push("updated_at=datetime('now')");
    db.prepare(`UPDATE meetings SET ${sets.join(',')} WHERE id=? AND user_id=?`).run(...vals, id, userId);
  },
  delete(id, userId) {
    db.prepare(`DELETE FROM meetings WHERE id=? AND user_id=?`).run(id, userId);
  },
};

function parseMeeting(row) {
  if (!row) return null;
  return { ...row, participants: safeJson(row.participants, []) };
}

// ─── Device preferences ───────────────────────────────────────────────────────

const devicePrefsOps = {
  get(fingerprint) {
    return db.prepare('SELECT * FROM device_prefs WHERE fingerprint=?').get(fingerprint) || null;
  },
  set(fingerprint, data) {
    const allowed = ['display_name', 'background_type', 'background_url', 'camera_device_id', 'mic_device_id', 'speaker_device_id'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return;
    const cols = ['fingerprint', ...fields, 'updated_at'];
    const vals = [fingerprint, ...fields.map(f => data[f]), new Date().toISOString()];
    db.prepare(`INSERT INTO device_prefs (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
      ON CONFLICT(fingerprint) DO UPDATE SET ${fields.map(f => `${f}=excluded.${f}`).join(',')}, updated_at=excluded.updated_at`)
      .run(...vals);
    return db.prepare('SELECT * FROM device_prefs WHERE fingerprint=?').get(fingerprint);
  },
};

// ─── Init: ensure admin user ──────────────────────────────────────────────────

function ensureAdminUser() {
  const count = db.prepare(`SELECT COUNT(*) as n FROM users`).get().n;
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const name = process.env.ADMIN_NAME || 'Admin';
    userOps.create(email, password, name);
    console.log(`[DB] Created admin user: ${email}`);
  }
}

const insightOps = {
  create({ user_id, call_log_id, tasks, email_draft, summary }) {
    const id = uuidv4();
    db.prepare(`INSERT INTO call_insights (id, call_log_id, user_id, tasks, email_draft, summary) VALUES (?,?,?,?,?,?)`)
      .run(id, call_log_id || null, user_id, JSON.stringify(tasks || []), email_draft || '', summary || '');
    return db.prepare('SELECT * FROM call_insights WHERE id=?').get(id);
  },
  listByUser(user_id, limit = 20) {
    return db.prepare('SELECT * FROM call_insights WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(user_id, limit);
  },
  getByCallLog(call_log_id) {
    return db.prepare('SELECT * FROM call_insights WHERE call_log_id=?').get(call_log_id);
  },
};

module.exports = {
  db,
  userOps,
  sessionOps,
  contactOps,
  phoneOps,
  smsOps,
  voicemailOps,
  callLogOps,
  recordingOps,
  recordingCommentOps,
  meetingOps,
  devicePrefsOps,
  insightOps,
  ensureAdminUser,
};
