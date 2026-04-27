import { useState } from 'react';
import type { InterviewContext, TimeMilestone } from '../types';

interface Props {
  context: InterviewContext;
  onSave: (context: InterviewContext) => void;
  onClose: () => void;
}

export default function InterviewContextPanel({ context, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<InterviewContext>({ ...context, milestones: [...context.milestones] });

  function update(key: keyof InterviewContext, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function addMilestone() {
    setDraft(prev => ({
      ...prev,
      milestones: [...prev.milestones, { minuteMark: 5, goal: '' }],
    }));
  }

  function updateMilestone(i: number, field: keyof TimeMilestone, value: string | number) {
    setDraft(prev => {
      const milestones = [...prev.milestones];
      milestones[i] = { ...milestones[i], [field]: value };
      return { ...prev, milestones };
    });
  }

  function removeMilestone(i: number) {
    setDraft(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, idx) => idx !== i),
    }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Interview Context</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-500">This context is sent to the AI so it can give you relevant coaching feedback during the interview.</p>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Role you're interviewing for</span>
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
            placeholder="e.g. behavioral, technical, HR screen"
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Notes / prep context</span>
          <span className="text-xs text-gray-400">Anything the AI should know — things to emphasize, avoid, or watch for</span>
          <textarea value={draft.notes} onChange={e => update('notes', e.target.value)}
            rows={3} placeholder="e.g. Interviewer values concise answers. Don't mention the gap year unless asked."
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Time milestones</span>
            <button onClick={addMilestone}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              + Add milestone
            </button>
          </div>
          <span className="text-xs text-gray-400">Where you should be at certain points in the interview</span>

          {draft.milestones.length === 0 && (
            <p className="text-xs text-gray-400 italic">No milestones yet.</p>
          )}

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
