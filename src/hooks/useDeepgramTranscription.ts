import { useState, useRef, useCallback } from 'react';
import { DeepgramClient } from '@deepgram/sdk';

interface Result {
  isListening: boolean;
  transcript: string;
  interimText: string;
  start: (apiKey: string, keyterms: string) => void;
  stop: () => void;
  error: string | null;
}

export function useDeepgramTranscription(): Result {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const start = useCallback(async (apiKey: string, keyterms: string) => {
    setError(null);
    setTranscript('');
    setInterimText('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const client = new DeepgramClient({ apiKey });

      const keytermsArray = keyterms
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const connection = await client.listen.v1.connect({
        model: 'nova-3',
        language: 'en',
        smart_format: 'true',
        interim_results: 'true',
        ...(keytermsArray.length > 0 ? { keyterm: keytermsArray } : {}),
      });

      connection.on('open', () => {
        setIsListening(true);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
          }
          try {
            connection.socket.send(int16.buffer);
          } catch {}
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      });

      connection.on('message', (data: any) => {
        if (data?.type !== 'Results') return;
        const alt = data?.channel?.alternatives?.[0];
        const text = alt?.transcript ?? '';
        const isFinal = data?.is_final;

        if (isFinal && text.trim()) {
          setTranscript(prev => prev + text + ' ');
          setInterimText('');
        } else if (!isFinal && text) {
          setInterimText(text);
        }
      });

      connection.on('error', (err: any) => {
        console.error('[Deepgram] Error:', err);
        setError('Deepgram error — check your API key.');
        setIsListening(false);
      });

      connection.on('close', () => {
        setIsListening(false);
        setInterimText('');
      });

      connectionRef.current = connection;
      connection.connect();

    } catch (err: any) {
      setError('Could not start: ' + (err?.message ?? String(err)));
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    try { connectionRef.current?.finish(); } catch {}
    connectionRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  return { isListening, transcript, interimText, start, stop, error };
}
