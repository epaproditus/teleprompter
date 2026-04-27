import { useEffect, useRef, useState } from 'react';
import type { TalkingPoint, AppSettings, InterviewContext } from '../types';

interface Props {
  transcript: string;
  points: TalkingPoint[];
  settings: AppSettings;
  context: InterviewContext;
  isListening: boolean;
  elapsedSeconds: number;
}

export function useCoachingFeedback({ transcript, points, settings, context, isListening, elapsedSeconds }: Props) {
  const [feedback, setFeedback] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const transcriptRef = useRef(transcript);
  const pointsRef = useRef(points);
  const settingsRef = useRef(settings);
  const contextRef = useRef(context);
  const elapsedRef = useRef(elapsedSeconds);

  transcriptRef.current = transcript;
  pointsRef.current = points;
  settingsRef.current = settings;
  contextRef.current = context;
  elapsedRef.current = elapsedSeconds;

  useEffect(() => {
    if (!isListening) return;

    const FEEDBACK_INTERVAL_MS = settingsRef.current.feedbackIntervalSec * 1000;

    const timer = setInterval(async () => {
      const s = settingsRef.current;
      const ctx = contextRef.current;
      const transcript = transcriptRef.current;
      const points = pointsRef.current;
      const elapsed = elapsedRef.current;

      if (!s.apiKey || !transcript.trim()) return;

      const covered = points.filter(p => p.isCovered).map(p => p.text);
      const uncovered = points.filter(p => !p.isCovered).map(p => p.text);
      const elapsedMin = Math.floor(elapsed / 60);
      const elapsedSec = elapsed % 60;
      const targetMin = contextRef.current.targetDurationMin;

      // Time-aware progress: what % through the interview are you?
      let timeContext = '';
      if (targetMin && targetMin > 0) {
        const pct = Math.round((elapsed / 60 / targetMin) * 100);
        const remaining = Math.max(0, targetMin * 60 - elapsed);
        const remMin = Math.floor(remaining / 60);
        const remSec = remaining % 60;
        const pace = Math.round((covered.length / Math.max(1, elapsed / 60)) * 60); // points per minute
        timeContext = `Time context: Target is ${targetMin} min total. Elapsed: ${elapsedMin}:${String(elapsedSec).padStart(2, '0')} (${pct}% done). ${remMin}:${String(remMin > 0 ? remSec : 0).padStart(2, '0')} remaining. Covering ~${pace} points/min.`;
      }

      const milestonePart = ctx.milestones.length > 0
        ? `Time milestones:\n${ctx.milestones.map(m => `- By ${m.minuteMark} min: ${m.goal}`).join('\n')}`
        : '';

      const prompt = `You are a real-time interview coach. The candidate is ${elapsedMin} minutes into a ${ctx.interviewType || 'job'} interview for ${ctx.role || 'a role'}${ctx.company ? ` at ${ctx.company}` : ''}.
${timeContext ? timeContext + '\n' : ''}${ctx.notes ? `Context: ${ctx.notes}\n` : ''}${milestonePart}

Talking points covered so far: ${covered.length > 0 ? covered.join(', ') : 'none yet'}
Talking points not yet covered: ${uncovered.length > 0 ? uncovered.join(', ') : 'all covered!'}

Recent transcript (last ~500 words):
"${transcript.slice(-2000)}"

Return 2-4 coaching notes as a JSON array of SHORT strings (under 8 words each). Each note is one glanceable observation. No markdown, no punctuation, no explanation — just the note itself.

${timeContext ? 'CRITICAL: Reference the time context in your coaching. If they are behind schedule, tell them to speed up and simplify. If they are ahead, tell them to expand. Include time-based notes like "Slow down — ahead of pace" or "Running long — move on."' : ''}

Examples of good notes: "Off topic", "Mention the team size", "Running behind on intro", "Good pace", "Bring up cost savings", "Too much detail here"

Return ONLY the JSON array, nothing else. Example: ["Off topic", "Mention team size next", "Good energy"]`;

      const isOpenAI = s.apiType === 'openai';
      const url = isOpenAI ? `${s.apiBaseUrl}/v1/chat/completions` : `${s.apiBaseUrl}/v1/messages`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(isOpenAI
          ? { 'Authorization': `Bearer ${s.apiKey}` }
          : { 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' }),
      };

      setLoading(true);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: s.model, max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await res.json();
        const text = isOpenAI
          ? (data?.choices?.[0]?.message?.content ?? '')
          : (data?.content?.[0]?.text ?? '');
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
          const notes: string[] = JSON.parse(match[0]);
          if (notes.length > 0) setFeedback(notes);
        }
      } catch (err) {
        console.error('[Coaching] Error:', err);
      } finally {
        setLoading(false);
      }
    }, FEEDBACK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isListening]);

  return { feedback, loading };
}
