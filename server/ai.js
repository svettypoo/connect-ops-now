// ai.js — Claude AI integration for Inbox AI
'use strict';

const Anthropic = require('@anthropic-ai/sdk');

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = 'claude-sonnet-4-6';

// Helper: make a simple non-streaming call
async function ask(system, user, maxTokens = 1024) {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY not configured');
  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return resp.content[0].text;
}

// Helper: streaming call — yields text chunks via callback
async function askStream(system, user, onChunk, maxTokens = 4096) {
  const c = getClient();
  if (!c) throw new Error('ANTHROPIC_API_KEY not configured');
  const stream = c.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
  });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      onChunk(chunk.delta.text);
    }
  }
  return stream.finalMessage();
}

// ─── Feature: Summarize email / thread ────────────────────────────────────────

async function summarize(email) {
  const body = email.body_text || stripHtml(email.body_html || '');
  if (!body || body.length < 100) return body.substring(0, 200);

  return ask(
    `You are an expert email assistant. Summarize emails concisely and clearly.
     Focus on: what action (if any) is needed, key information, and deadlines.
     Use plain language. Max 2-3 sentences. No bullet points.`,
    `Summarize this email:\nFrom: ${email.from_name || email.from_address}\nSubject: ${email.subject}\n\n${body.substring(0, 3000)}`
  );
}

// ─── Feature: Extract action items ───────────────────────────────────────────

async function extractActions(email) {
  const body = email.body_text || stripHtml(email.body_html || '');
  if (!body) return [];

  const raw = await ask(
    `Extract action items and deadlines from emails. Return a JSON array of objects with:
     { "action": "description", "deadline": "date string or null", "priority": "high|medium|low" }
     If no action items, return []. ONLY return the JSON array, nothing else.`,
    `Email subject: ${email.subject}\n\n${body.substring(0, 3000)}`
  );

  try {
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Feature: Generate smart replies ─────────────────────────────────────────

async function suggestReplies(email, threadContext = '') {
  const body = email.body_text || stripHtml(email.body_html || '');

  const raw = await ask(
    `Generate 3 email reply options. Return a JSON object with exactly this structure:
     { "brief": "short 1-2 sentence reply", "detailed": "thorough reply", "formal": "professional formal reply" }
     Each should be a complete, ready-to-send email reply body.
     Do not include subject line or greeting — just the body content.
     ONLY return the JSON, nothing else.`,
    `Email to reply to:\nFrom: ${email.from_name || email.from_address}\nSubject: ${email.subject}\n\n${body.substring(0, 2000)}${threadContext ? '\n\nThread context:\n' + threadContext.substring(0, 1000) : ''}`,
    1500
  );

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { brief: 'Thank you for your email.', detailed: 'Thank you for reaching out. I will get back to you shortly.', formal: 'Dear sender, Thank you for your correspondence.' };
  }
}

// ─── Feature: Compose email from prompt (streaming) ──────────────────────────

async function composeFromPrompt(prompt, context = {}, onChunk) {
  const system = `You are an expert email writer composing on behalf of ${context.senderName || 'the user'} (${context.senderEmail || ''}).
  CRITICAL IDENTITY RULE: You are ALWAYS writing as ${context.senderName || 'the user'}. Never write as or impersonate any other person mentioned in the context.
  Write ONLY the email body — no subject line, no "Subject:" prefix, no meta-commentary.
  Use appropriate tone: professional but warm unless specified otherwise.`;

  const user = `Write an email based on this prompt: ${prompt}
  ${context.to ? `To: ${context.to}` : ''}
  ${context.additionalContext ? `Additional context: ${context.additionalContext}` : ''}`;

  if (onChunk) {
    return askStream(system, user, onChunk);
  }
  return ask(system, user, 1024);
}

// ─── Feature: Generate subject from body ──────────────────────────────────────

async function generateSubject(body) {
  return ask(
    `Generate a concise, clear email subject line. Return ONLY the subject line text, nothing else. No quotes.`,
    `Email body: ${body.substring(0, 1500)}`
  );
}

// ─── Feature: Polish email text ───────────────────────────────────────────────

async function polish(text, instruction = 'improve clarity and professionalism') {
  return ask(
    `You are an expert email editor. ${instruction}.
     Return ONLY the improved email text, no commentary or explanation.
     Preserve the original meaning and intent.`,
    `Improve this email text:\n\n${text}`,
    1500
  );
}

// ─── Feature: Analyze tone ────────────────────────────────────────────────────

async function analyzeTone(text) {
  const raw = await ask(
    `Analyze the tone of this email. Return a JSON object:
     {
       "tone": "one of: professional|casual|formal|aggressive|passive-aggressive|warm|cold|urgent|neutral",
       "score": 0-10 (10 = perfectly professional),
       "issues": ["list of issues if any"],
       "suggestion": "one improvement suggestion or null"
     }
     ONLY return the JSON.`,
    `Analyze this email:\n\n${text.substring(0, 2000)}`
  );
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { tone: 'neutral', score: 7, issues: [], suggestion: null };
  }
}

// ─── Feature: Categorize email ────────────────────────────────────────────────

async function categorize(email) {
  const body = email.body_text || stripHtml(email.body_html || '');
  const raw = await ask(
    `Categorize this email into exactly one category. Return a JSON object:
     { "category": "one of: primary|social|promotions|updates|notifications|spam", "priority": 1-10, "has_meeting": true/false }
     primary = important personal/work emails that need attention
     social = newsletters, social networks
     promotions = marketing, deals, offers
     updates = automated notifications, receipts, confirmations
     notifications = system alerts, automated reports
     spam = unwanted email
     priority 10 = extremely urgent/important, 1 = completely unimportant
     ONLY return the JSON.`,
    `From: ${email.from_name || email.from_address} <${email.from_address}>\nSubject: ${email.subject}\n\n${body.substring(0, 500)}`,
    256
  );
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { category: 'primary', priority: 5, has_meeting: false };
  }
}

// ─── Feature: Natural language search ─────────────────────────────────────────

async function naturalLanguageSearch(query) {
  const raw = await ask(
    `Convert a natural language email search query into structured filters. Return JSON:
     {
       "keywords": "key terms to search in email body/subject",
       "from": "sender email or name, or null",
       "to": "recipient email or name, or null",
       "folder": "inbox|sent|drafts|trash|spam|archive or null",
       "is_read": true/false/null,
       "is_starred": true/false/null,
       "has_attachment": true/false/null,
       "date_after": "YYYY-MM-DD or null",
       "date_before": "YYYY-MM-DD or null",
       "category": "primary|social|promotions|updates|notifications or null"
     }
     ONLY return the JSON. Today's date: ${new Date().toISOString().split('T')[0]}`,
    `Search query: ${query}`
  );
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { keywords: query };
  }
}

// ─── Feature: Detect meetings ─────────────────────────────────────────────────

async function detectMeeting(email) {
  const body = email.body_text || stripHtml(email.body_html || '');
  const raw = await ask(
    `Check if this email contains a meeting request or proposal. If yes, extract details.
     Return JSON: { "has_meeting": true/false, "title": "meeting title or null", "date": "date or null", "time": "time or null", "duration": "duration or null", "location": "location or null", "attendees": [] }
     ONLY return the JSON.`,
    `Subject: ${email.subject}\n\n${body.substring(0, 1000)}`,
    256
  );
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { has_meeting: false };
  }
}

// ─── Feature: Ask AI about email (streaming) ──────────────────────────────────

async function askAboutEmail(email, question, onChunk) {
  const body = email.body_text || stripHtml(email.body_html || '');
  const system = `You are an intelligent email assistant helping the user understand and act on their email.
  Be concise, clear, and helpful. Use markdown formatting.`;
  const user = `Email context:\nFrom: ${email.from_name || email.from_address}\nSubject: ${email.subject}\n\n${body.substring(0, 3000)}\n\nUser question: ${question}`;

  if (onChunk) {
    return askStream(system, user, onChunk);
  }
  return ask(system, user, 1024);
}

// ─── Feature: Summarize recording transcript ──────────────────────────────────

async function summarizeTranscript(title, transcript) {
  return ask(
    `You are an expert at summarizing spoken recordings. Given a transcript, produce two sections:

SECTION 1 — KEY POINTS:
3-6 concise bullet points starting with •
Focus on what was discussed, decisions made, and important information.

SECTION 2 — ACTION ITEMS:
List every concrete action, task, or follow-up mentioned, each as a checkbox line starting with ☐
If none are mentioned, write "☐ No action items identified"

Format your response EXACTLY as:
KEY POINTS
• point 1
• point 2

ACTION ITEMS
☐ action 1
☐ action 2

Be specific and direct. Use plain language. No other text.`,
    `Recording title: "${title}"\n\nTranscript:\n${transcript.substring(0, 6000)}`,
    768
  );
}

// ─── Batch: auto-categorize and summarize new email ──────────────────────────

async function enrichEmail(email, db) {
  if (!getClient()) return; // AI not configured
  try {
    const [cat, summary, actions] = await Promise.all([
      categorize(email),
      summarize(email),
      extractActions(email),
    ]);

    db.emailOps?.update(email.id, email.user_id, {
      ai_category: cat.category,
      ai_priority: cat.priority,
      ai_has_meeting: cat.has_meeting ? 1 : 0,
      ai_summary: summary,
      ai_action_items: actions,
    });
  } catch (err) {
    console.error('[AI] enrichEmail error:', err.message);
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

module.exports = {
  ask,
  summarize,
  extractActions,
  suggestReplies,
  composeFromPrompt,
  generateSubject,
  polish,
  analyzeTone,
  categorize,
  naturalLanguageSearch,
  detectMeeting,
  askAboutEmail,
  enrichEmail,
  summarizeTranscript,
  isConfigured,
};
