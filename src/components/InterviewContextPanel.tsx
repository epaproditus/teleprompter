import { useState } from 'react';
import type { InterviewContext, TimeMilestone, AppSettings, ScriptSection } from '../types';

interface Props {
  context: InterviewContext;
  settings: AppSettings;
  onSave: (context: InterviewContext) => void;
  onClose: () => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function InterviewContextPanel({ context, settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<InterviewContext>({
    ...context,
    milestones: [...context.milestones],
    scriptSections: [...(context.scriptSections ?? [])],
  });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  function update(key: keyof InterviewContext, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function addMilestone() {
    setDraft(prev => ({ ...prev, milestones: [...prev.milestones, { minuteMark: 5, goal: '' }] }));
  }

  function updateMilestone(i: number, field: keyof TimeMilestone, value: string | number) {
    setDraft(prev => {
      const milestones = [...prev.milestones];
      milestones[i] = { ...milestones[i], [field]: value };
      return { ...prev, milestones };
    });
  }

  function removeMilestone(i: number) {
    setDraft(prev => ({ ...prev, milestones: prev.milestones.filter((_, idx) => idx !== i) }));
  }

  async function parseScript() {
    if (!draft.script.trim()) return;
    if (!settings.apiKey) { setParseError('No API key — open Settings first.'); return; }

    setParsing(true);
    setParseError('');

    const prompt = `Split this script/outline into logical sections for an interview presentation.

Script:
"""
${draft.script}
"""

Rules:
- Aim for 4 sections exactly (you must produce exactly 4)
- Each section should be a coherent chunk (intro, one main topic, closing, etc.)
- Give each section a short title (3-6 words)
- Keep the original wording in content — don't rewrite

Return ONLY a JSON array with exactly 4 items: [{"title": "...", "content": "..."}]`;

    const isOpenAI = settings.apiType === 'openai';
    const url = isOpenAI ? `${settings.apiBaseUrl}/v1/chat/completions` : `${settings.apiBaseUrl}/v1/messages`;
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
        body: JSON.stringify({ model: settings.model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      const text = isOpenAI
        ? (data?.choices?.[0]?.message?.content ?? '')
        : (data?.content?.[0]?.text ?? '');

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse response');
      const raw: { title: string; content: string }[] = JSON.parse(match[0]);
      const sections: ScriptSection[] = raw.map(s => ({
        id: generateId(),
        title: s.title,
        content: s.content,
        isActive: false,
        isCovered: false,
        language: undefined,
      }));
      setDraft(prev => ({ ...prev, scriptSections: sections }));
    } catch (err) {
      setParseError('Failed to parse script — check API settings.');
      console.error(err);
    } finally {
      setParsing(false);
    }
  }

  function updateScriptSection(i: number, field: keyof ScriptSection, value: any) {
    setDraft(prev => {
      const sections = [...prev.scriptSections];
      sections[i] = { ...sections[i], [field]: value };
      return { ...prev, scriptSections: sections };
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-5 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Interview Context</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Role</span>
            <input type="text" value={draft.role} onChange={e => update('role', e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Company</span>
            <input type="text" value={draft.company} onChange={e => update('company', e.target.value)}
              placeholder="e.g. Acme Corp"
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Interview type</span>
            <input type="text" value={draft.interviewType} onChange={e => update('interviewType', e.target.value)}
              placeholder="e.g. behavioral, technical"
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Notes / prep context</span>
          <textarea value={draft.notes} onChange={e => update('notes', e.target.value)}
            rows={2} placeholder="Things to emphasize, avoid, or watch for..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </label>

        {/* Script section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-700">Script / outline</span>
              <span className="text-xs text-gray-400 ml-2">Paste your prepared content — AI will split it into sections</span>
            </div>
            <button
              onClick={parseScript}
              disabled={parsing || !draft.script.trim()}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {parsing ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Parsing...</>
              ) : '✦ Parse into sections'}
            </button>
          </div>

          {parseError && <p className="text-red-500 text-xs">{parseError}</p>}

          <textarea
            value={draft.script}
            onChange={e => update('script', e.target.value)}
            rows={6}
            placeholder="Paste your script, talking notes, or outline here..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
          />

          {draft.scriptSections.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500 font-medium">
                {draft.scriptSections.length} sections — tap the language chip to flag sections in Spanish
              </p>
              {draft.scriptSections.map((s, i) => (
                <div key={s.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                  <span className="text-gray-400 font-mono text-xs mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700">{s.title}</p>
                    <p className="text-gray-400 text-xs line-clamp-1">{s.content}</p>
                  </div>
                  <button
                    onClick={() => updateScriptSection(i, 'language', s.language === 'es' ? undefined : 'es')}
                    className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      s.language === 'es'
                        ? 'bg-amber-100 border-amber-400 text-amber-700'
                        : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                    }`}
                    title={s.language === 'es' ? 'Click to mark as English' : 'Click to mark as Spanish'}
                  >
                    {s.language === 'es' ? 'ES' : 'EN'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time milestones */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Time milestones</span>
            <button onClick={addMilestone} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add</button>
          </div>
          {draft.milestones.length === 0 && <p className="text-xs text-gray-400 italic">No milestones yet.</p>}
          {draft.milestones.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-sm text-gray-500 whitespace-nowrap">Min</span>
              <input type="number" min={1} value={m.minuteMark}
                onChange={e => updateMilestone(i, 'minuteMark', Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 w-16 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input type="text" value={m.goal} placeholder="Goal at this point..."
                onChange={e => updateMilestone(i, 'goal', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => removeMilestone(i)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
