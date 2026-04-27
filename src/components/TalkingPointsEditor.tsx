import { useState } from 'react';
import type { TalkingPoint } from '../types';

interface Props {
  points: TalkingPoint[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}

export default function TalkingPointsEditor({ points, onAdd, onDelete }: Props) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-800">Talking Points</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a talking point..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>

      {points.length === 0 && (
        <p className="text-gray-400 text-sm">No points yet. Add one above.</p>
      )}

      <ul className="flex flex-col gap-2">
        {points.map(point => (
          <li
            key={point.id}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
          >
            <span className="text-gray-800">{point.text}</span>
            <button
              onClick={() => onDelete(point.id)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-4 text-sm"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
