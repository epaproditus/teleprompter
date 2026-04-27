import { useState, useRef, useCallback } from 'react';

interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  interimText: string;
  start: () => void;
  stop: () => void;
  error: string | null;
}

export function useSpeechRecognition(intervalSec = 5): UseSpeechRecognitionResult {
  const CHUNK_INTERVAL_MS = intervalSec * 1000;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isListeningRef = useRef(false);

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  function startRecorder() {
    if (!streamRef.current || !isListeningRef.current) return;

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      // Start next recorder immediately — no gap in listening
      startRecorder();

      // Send this chunk to Whisper in the background
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 1000) {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        fetch('http://localhost:3001/transcribe', { method: 'POST', body: formData })
          .then(r => r.json())
          .then(data => {
            if (data.text?.trim()) {
              setTranscript(prev => prev + data.text.trim() + ' ');
            }
          })
          .catch(err => console.error('Transcription error:', err));
      }
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, CHUNK_INTERVAL_MS);
  }

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);
      startRecorder();
    } catch {
      setError('Could not access microphone. Please allow microphone permission.');
    }
  }, []);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  return { isListening, transcript, interimText, start, stop, error };
}
