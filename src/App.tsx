import { useState, useEffect } from 'react';
import type { TalkingPoint } from './types';
import { loadPoints, savePoints } from './services/storage';
import TalkingPointsEditor from './components/TalkingPointsEditor';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [points, setPoints] = useState<TalkingPoint[]>([]);

  useEffect(() => {
    setPoints(loadPoints());
  }, []);

  function addPoint(text: string) {
    const newPoint: TalkingPoint = {
      id: generateId(),
      text,
      isCovered: false,
      confidence: 0,
    };
    const updated = [...points, newPoint];
    setPoints(updated);
    savePoints(updated);
  }

  function deletePoint(id: string) {
    const updated = points.filter(p => p.id !== id);
    setPoints(updated);
    savePoints(updated);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Teleprompter</h1>
        <p className="text-gray-500 mb-8">Add your talking points. The app will check them off as you speak.</p>
        <TalkingPointsEditor points={points} onAdd={addPoint} onDelete={deletePoint} />
      </div>
    </div>
  );
}
