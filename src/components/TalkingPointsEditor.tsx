import { useState } from 'react';
import type { TalkingPoint, AppSettings, InterviewContext, ScriptSection } from '../types';

interface Props {
  points: TalkingPoint[];
  settings: AppSettings;
  context: InterviewContext;
  scriptSections: ScriptSection[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
  onReplace: (points: string[]) => void;
}

export default function TalkingPointsEditor({ points, settings, context, scriptSections, onAdd, onDelete, onReplace }: Props) {
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  async function handleGenerate() {
    if (!settings.apiKey) {
      setError('No API key set — open Settings first.');
      return;
    }

    setGenerating(true);
    setError('');

    // Derive talking points from script sections if they exist, otherwise use context
    const useScriptMode = scriptSections.length > 0;
    let prompt: string;

    if (useScriptMode) {
      const sectionList = scriptSections
        .map((s, i) => `${i + 1}. [${s.language === 'es' ? 'SPANISH' : 'ENGLISH'}] ${s.title}: "${s.content}"`)
        .join('\n');
      prompt = `You are helping someone prepare for a job interview. Your job is to generate talking points that map to specific sections of their prepared script.

Script sections:
${sectionList}

Rules:
- Generate exactly as many talking points as there are sections above (${scriptSections.length} points)
- Each talking point should capture the KEY things to say when delivering that section
- Max 15 words per point
- Short and specific — something they can check off when mentioned
- If a section is marked SPANISH, the point should be in Spanish
- Return ONLY a JSON array of strings, one per section in order

Good example for an English section: "Mention 3 years of Go experience and recent promotion"
Good example for a Spanish section: "Hablar de 5 años de experiencia en Kubernetes y liderazgo de equipo"

Return ONLY a JSON array with ${scriptSections.length} items.`;
    } else {
      const hasContext = context.role || context.company || context.interviewType || context.notes;
      if (!hasContext) {
        setError('Fill in at least a role or interview type in the context panel (📄) first, or add a script with sections.');
        setGenerating(false);
        return;
      }
      prompt = `You are helping someone prepare for a job interview. Generate 6-8 talking points they should cover.

Interview details:
- Role: ${context.role || 'not specified'}
- Company: ${context.company || 'not specified'}
- Interview type: ${context.interviewType || 'not specified'}
- Additional context: ${context.notes || 'none'}

Rules:
- Each point is ONE distinct idea, max 12 words
- Short and specific — something they can check off when mentioned
- No full sentences, no punctuation at the end
- No combining multiple ideas into one point

Return ONLY a JSON array of short strings.
Good example: ["Led team of 5 engineers", "Reduced API latency by 40%", "Shipped payments rewrite on time", "Experience with Go and distributed systems"]
Bad example: ["Led a team and reduced latency while also shipping the rewrite on time"]`;
    }

    const isOpenAI = settings.apiType === 'openai';
    const url = isOpenAI
      ? `${settings.apiBaseUrl}/v1/chat/completions`
      : `${settings.apiBaseUrl}/v1/messages`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(isOpenAI
        ? { 'Authorization': `Bearer ${settings.apiKey}` }
        : { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }),
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = isOpenAI
        ? (data?.choices?.[0]?.message?.content ?? '')
        : (data?.content?.[0]?.text ?? '');

      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) throw new Error('Could not parse response');
      const suggestions: string[] = JSON.parse(match[0]);

      if (points.length > 0) {
        const confirmed = window.confirm(
          `Replace your ${points.length} existing point${points.length > 1 ? 's' : ''} with ${suggestions.length} AI-generated ones?`
        );
        if (!confirmed) return;
      }
      onReplace(suggestions);
    } catch (err: any) {
      setError('Generation failed — check your API settings.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Talking Points</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating...
            </>
          ) : (
            <>✦ Generate with AI</>
          )}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Or add a point manually..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>

      {points.length === 0 && !generating && (
        <p className="text-gray-400 text-sm">
          No points yet. Fill in your interview context (📄) then click <strong>Generate with AI</strong>, or add points manually above.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {points.map(point => (
          <li
            key={point.id}
            className={`flex items-center justify-between border rounded-lg px-4 py-3 transition-colors ${
              point.isCovered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg ${point.isCovered ? 'text-green-500' : 'text-gray-300'}`}>
                {point.isCovered ? '✓' : '○'}
              </span>
              <span className={point.isCovered ? 'text-green-800 line-through' : 'text-gray-800'}>
                {point.text}
              </span>
            </div>
            {!point.isCovered && (
              <button
                onClick={() => onDelete(point.id)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-4 text-sm"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
