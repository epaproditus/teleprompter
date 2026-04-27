import { useEffect, useRef } from 'react';
import type { ScriptSection, AppSettings } from '../types';

interface Props {
  transcript: string;
  sections: ScriptSection[];
  settings: AppSettings;
  isListening: boolean;
  onUpdate: (sections: ScriptSection[]) => void;
}

export function useScriptTracker({ transcript, sections, settings, isListening, onUpdate }: Props) {
  const transcriptRef = useRef(transcript);
  const sectionsRef = useRef(sections);
  const settingsRef = useRef(settings);
  const onUpdateRef = useRef(onUpdate);

  transcriptRef.current = transcript;
  sectionsRef.current = sections;
  settingsRef.current = settings;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!isListening || sections.length === 0) return;

    const timer = setInterval(async () => {
      const s = settingsRef.current;
      const transcript = transcriptRef.current;
      const sections = sectionsRef.current;

      if (!s.apiKey || !transcript.trim()) return;

      const sectionList = sections
        .map((sec, i) => `${i + 1}. [ID: ${sec.id}] ${sec.title}${sec.language === 'es' ? ' [SPANISH]' : ''}: "${sec.content.slice(0, 120)}..."`)
        .join('\n');

      const hasSpanish = sections.some(s => s.language === 'es');
      const langNote = hasSpanish
        ? '\nNote: Some sections are in Spanish — the speaker will use Spanish when covering those sections.'
        : '';

      const prompt = `You are tracking where a speaker is in their prepared script.

Script sections:
${sectionList}${langNote}

Recent transcript (last ~300 words):
"${transcript.slice(-1200)}"

Which section is the speaker currently covering? Pick the best match even if they're paraphrasing.
Also list any sections they have clearly already completed and moved past.

Return ONLY JSON: {"activeId": "section-id-or-null", "coveredIds": ["id1", "id2"]}`;

      const isOpenAI = s.apiType === 'openai';
      const url = isOpenAI ? `${s.apiBaseUrl}/v1/chat/completions` : `${s.apiBaseUrl}/v1/messages`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(isOpenAI
          ? { 'Authorization': `Bearer ${s.apiKey}` }
          : { 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01' }),
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: s.model, max_tokens: 128, messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await res.json();
        const text = isOpenAI
          ? (data?.choices?.[0]?.message?.content ?? '')
          : (data?.content?.[0]?.text ?? '');

        const match = text.match(/\{[\s\S]*?\}/);
        if (!match) return;
        const result: { activeId: string | null; coveredIds: string[] } = JSON.parse(match[0]);

        const updated = sections.map(sec => ({
          ...sec,
          isActive: sec.id === result.activeId,
          isCovered: result.coveredIds.includes(sec.id),
        }));
        onUpdateRef.current(updated);
      } catch (err) {
        console.error('[ScriptTracker] Error:', err);
      }
    }, settingsRef.current.matchingIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isListening, sections.length]);
}
