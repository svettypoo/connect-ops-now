import { formatTranscript } from './utils';

// Transcript display component with formatted text
export default function TranscriptBlock({ text, maxHeight = '200px' }) {
  const paragraphs = formatTranscript(text);
  return (
    <div style={{ maxHeight, overflowY: 'auto', scrollbarWidth: 'thin' }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: 1.7 }}>{p}</p>
      ))}
    </div>
  );
}
