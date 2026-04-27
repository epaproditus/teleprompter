import { useEffect, useRef } from 'react';
import type { TalkingPoint, AppSettings } from '../types';

interface Props {
  transcript: string;
  points: TalkingPoint[];
  settings: AppSettings;
  isListening: boolean;
  onCover: (ids: string[]) => void;
  activeSectionLanguage?: 'en' | 'es';
}

export function useSemanticMatcher({ transcript, points, settings, isListening, onCover, activeSectionLanguage }: Props) {
  // Keep refs so the interval always reads the latest values without restarting
  const transcriptRef = useRef(transcript);
  const pointsRef = useRef(points);
  const settingsRef = useRef(settings);
  const onCoverRef = useRef(onCover);
  const lastCheckedLengthRef = useRef(0);

  transcriptRef.current = transcript;
  pointsRef.current = points;
  settingsRef.current = settings;
  onCoverRef.current = onCover;

  // Start/stop the interval only when listening state changes
  useEffect(() => {
    if (!isListening) {
      lastCheckedLengthRef.current = 0;
      return;
    }

    const intervalMs = settingsRef.current.matchingIntervalSec * 1000;
    console.log(`[Matcher] Started — will check every ${settingsRef.current.matchingIntervalSec}s`);

    const timer = setInterval(async () => {
      const settings = settingsRef.current;
      const transcript = transcriptRef.current;
      const points = pointsRef.current;

      if (!settings.apiKey) {
        console.log('[Matcher] No API key set, skipping.');
        return;
      }

      const uncovered = points.filter(p => !p.isCovered);
      if (uncovered.length === 0) {
        console.log('[Matcher] All points covered, nothing to check.');
        return;
      }

      const newText = transcript.slice(lastCheckedLengthRef.current);
      if (!newText.trim()) {
        console.log('[Matcher] No new transcript text, skipping.');
        return;
      }

      const pointsList = uncovered
        .map(p => `- ID: ${p.id} | Point: "${p.text}"`)
        .join('\n');

      const langNote = activeSectionLanguage === 'es'
        ? '\nNote: The speaker is currently delivering this section in SPANISH — expect Spanish language, code-switching, and accented English.'
        : '';

      const prompt = `You are helping track whether a speaker has covered specific talking points in an interview.

Talking points to check:
${pointsList}${langNote}

Recent speech transcript:
"${transcript.slice(-2000)}"

Which talking points has the speaker substantively covered? Return ONLY a JSON array of covered IDs, e.g. ["id1","id2"]. If none, return [].`;

      const isOpenAI = settings.apiType === 'openai';
      const fullUrl = isOpenAI
        ? `${settings.apiBaseUrl}/v1/chat/completions`
        : `${settings.apiBaseUrl}/v1/messages`;

      console.log('[Matcher] Sending to full URL:', fullUrl);
      console.log('[Matcher] Model:', settings.model);
      console.log('[Matcher] New transcript text:', newText.trim());

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(isOpenAI
          ? { 'Authorization': `Bearer ${settings.apiKey}` }
          : { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }),
      };

      const body = isOpenAI
        ? { model: settings.model, max_tokens: 256, messages: [{ role: 'user', content: prompt }] }
        : { model: settings.model, max_tokens: 256, messages: [{ role: 'user', content: prompt }] };

      try {
        const res = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await res.json();
        console.log('[Matcher] API response:', data);

        const text = isOpenAI
          ? (data?.choices?.[0]?.message?.content ?? '')
          : (data?.content?.[0]?.text ?? '');
        const match = text.match(/\[.*?\]/s);
        if (match) {
          const ids: string[] = JSON.parse(match[0]);
          console.log('[Matcher] Covered IDs:', ids);
          if (ids.length > 0) onCoverRef.current(ids);
        } else {
          console.log('[Matcher] No IDs found in response:', text);
        }
        lastCheckedLengthRef.current = transcript.length;
      } catch (err) {
        console.error('[Matcher] Fetch error:', err);
      }
    }, intervalMs);

    return () => {
      console.log('[Matcher] Stopped.');
      clearInterval(timer);
    };
  }, [isListening]);
}
