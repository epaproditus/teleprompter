import { useState } from 'react';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  function update(key: keyof AppSettings, value: string | number) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Transcription</h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Recording interval (seconds)</span>
            <span className="text-xs text-gray-400">How often a new audio chunk is sent to Whisper</span>
            <input
              type="number"
              min={2}
              max={30}
              value={draft.recordingIntervalSec}
              onChange={e => update('recordingIntervalSec', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 w-24 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Semantic Matching</h3>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Matching interval (seconds)</span>
            <span className="text-xs text-gray-400">How often the transcript is checked against your talking points</span>
            <input
              type="number"
              min={5}
              max={60}
              value={draft.matchingIntervalSec}
              onChange={e => update('matchingIntervalSec', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 w-24 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">API base URL</span>
            <span className="text-xs text-gray-400">Any Anthropic-compatible endpoint (Claude, MiniMax, local proxy...)</span>
            <input
              type="text"
              value={draft.apiBaseUrl}
              onChange={e => update('apiBaseUrl', e.target.value)}
              placeholder="https://api.anthropic.com"
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">API key</span>
            <input
              type="password"
              value={draft.apiKey}
              onChange={e => update('apiKey', e.target.value)}
              placeholder="sk-..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Model</span>
            <input
              type="text"
              value={draft.model}
              onChange={e => update('model', e.target.value)}
              placeholder="claude-3-5-haiku-20241022"
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
