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
  const [feedback, setFeedback] = useState<string>('');
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

      const milestonePart = ctx.milestones.length > 0
        ? `Time milestones:\n${ctx.milestones.map(m => `- By ${m.minuteMark} min: ${m.goal}`).join('\n')}`
        : '';

      const prompt = `You are a real-time interview coach. The candidate is ${elapsedMin} minutes into a ${ctx.interviewType || 'job'} interview for ${ctx.role || 'a role'}${ctx.company ? ` at ${ctx.company}` : ''}.

${ctx.notes ? `Context: ${ctx.notes}\n` : ''}${milestonePart}

Talking points covered so far: ${covered.length > 0 ? covered.join(', ') : 'none yet'}
Talking points not yet covered: ${uncovered.length > 0 ? uncovered.join(', ') : 'all covered!'}

Recent transcript (last ~500 words):
"${transcript.slice(-2000)}"

Give 1-2 sentences of concise, actionable coaching. Focus on: are they on track for the time elapsed, what should they prioritize next, any red flags in what they've said. Be direct and specific. No fluff.`;

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
        if (text.trim()) setFeedback(text.trim());
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
