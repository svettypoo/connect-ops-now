import { AVATAR_COLORS } from './constants';

export function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/[\s@]/);
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function avatarColor(str) { let h=0; for(let i=0;i<(str||'').length;i++) h=(h*31+str.charCodeAt(i))%AVATAR_COLORS.length; return AVATAR_COLORS[h]; }

export function fmtLogTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

// Format raw transcript into readable paragraphs by splitting on sentence boundaries
export function formatTranscript(text) {
  if (!text) return '';
  // Split on sentence-ending punctuation followed by space, or on common speech-to-text patterns
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .replace(/\b(hello|hi|hey|okay|all right|so where|so can|you're)\b/gi, '\n$1')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  // Group into paragraphs of ~3-4 sentences
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(' '));
  }
  return paragraphs;
}
