import { useState, useRef, useCallback, useEffect } from 'react';
import api from '@/api/inboxAiClient';

/**
 * useTranscription — abstraction over browser SpeechRecognition and Deepgram
 *
 * Interface:
 *   { start(), stop(), transcript (string[]), interim (string), isListening (bool), provider (string) }
 *
 * - Browser provider: uses webkitSpeechRecognition (Chrome only)
 * - Deepgram provider: WebSocket to Deepgram Nova-2 with MediaRecorder audio capture
 */
export default function useTranscription() {
  const [transcript, setTranscript] = useState([]);
  const [interim, setInterim] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [provider, setProvider] = useState('browser');

  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const providerRef = useRef('browser');

  // Fetch config on mount to know which provider is active
  useEffect(() => {
    api.getTranscriptionConfig()
      .then(data => {
        if (data?.provider) {
          setProvider(data.provider);
          providerRef.current = data.provider;
        }
      })
      .catch(() => {});
  }, []);

  const startBrowser = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      let interimText = '';
      const finals = [];
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) finals.push(text);
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finals.length) setTranscript(prev => [...prev, ...finals]);
      setInterim(interimText);
    };
    r.onerror = () => {};
    r.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_) {}
      }
    };
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
  }, []);

  const stopBrowser = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null; // clear first to prevent auto-restart in onend
      ref.stop();
    }
    setIsListening(false);
    setInterim('');
  }, []);

  const startDeepgram = useCallback(async () => {
    try {
      // Get API key from server
      const tokenData = await api.getTranscriptionToken();
      if (!tokenData?.key) {
        console.warn('[Transcription] No Deepgram key returned, falling back to browser');
        startBrowser();
        return;
      }

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Open WebSocket to Deepgram
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&interim_results=true&endpointing=300',
        ['token', tokenData.key]
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsListening(true);

        // Use MediaRecorder to capture and send audio chunks
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        };

        recorder.start(250); // send chunks every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alt = data?.channel?.alternatives?.[0];
          if (!alt) return;

          const text = alt.transcript?.trim();
          if (!text) return;

          if (data.is_final) {
            setTranscript(prev => [...prev, text]);
            setInterim('');
          } else {
            setInterim(text);
          }
        } catch (_) {}
      };

      ws.onerror = (err) => {
        console.warn('[Deepgram] WebSocket error:', err);
      };

      ws.onclose = () => {
        // Cleanup when WS closes
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      };
    } catch (err) {
      console.warn('[Transcription] Deepgram start failed, falling back to browser:', err.message);
      startBrowser();
    }
  }, [startBrowser]);

  const stopDeepgram = useCallback(() => {
    // Stop MediaRecorder
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        // Send close message to Deepgram
        wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (providerRef.current === 'deepgram') {
      startDeepgram();
    } else {
      startBrowser();
    }
  }, [startBrowser, startDeepgram]);

  const stop = useCallback(() => {
    if (providerRef.current === 'deepgram') {
      stopDeepgram();
    } else {
      stopBrowser();
    }
  }, [stopBrowser, stopDeepgram]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBrowser();
      stopDeepgram();
    };
  }, []); // eslint-disable-line

  return { start, stop, transcript, setTranscript, interim, isListening, provider };
}
