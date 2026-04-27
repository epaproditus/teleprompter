import { useState, useEffect, useCallback, useRef } from 'react';
import type { TalkingPoint, AppSettings, InterviewContext } from './types';
import { loadPoints, savePoints, loadSettings, saveSettings, loadContext, saveContext } from './services/storage';
import TalkingPointsEditor from './components/TalkingPointsEditor';
import LiveTranscript from './components/LiveTranscript';
import SettingsPanel from './components/SettingsPanel';
import InterviewContextPanel from './components/InterviewContextPanel';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDeepgramTranscription } from './hooks/useDeepgramTranscription';
import { useSemanticMatcher } from './hooks/useSemanticMatcher';
import { useCoachingFeedback } from './hooks/useCoachingFeedback';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [points, setPoints] = useState<TalkingPoint[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [context, setContext] = useState<InterviewContext>(loadContext());
  const [showSettings, setShowSettings] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const whisper = useSpeechRecognition(settings.recordingIntervalSec);
  const deepgram = useDeepgramTranscription();
  const active = settings.sttProvider === 'deepgram' ? deepgram : whisper;

  const handleStart = useCallback(() => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    if (settings.sttProvider === 'deepgram') {
      deepgram.start(settings.deepgramApiKey, settings.deepgramKeyterms);
    } else {
      whisper.start();
    }
  }, [settings, deepgram, whisper]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    active.stop();
  }, [active]);

  const handleCover = useCallback((ids: string[]) => {
    setPoints(prev => {
      const updated = prev.map(p =>
        ids.includes(p.id) ? { ...p, isCovered: true, coveredAt: Date.now(), confidence: 1 } : p
      );
      savePoints(updated);
      return updated;
    });
  }, []);

  useSemanticMatcher({ transcript: active.transcript, points, settings, isListening: active.isListening, onCover: handleCover });

  const { feedback, loading: feedbackLoading } = useCoachingFeedback({
    transcript: active.transcript,
    points,
    settings,
    context,
    isListening: active.isListening,
    elapsedSeconds,
  });

  useEffect(() => {
    setPoints(loadPoints());
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function addPoint(text: string) {
    const newPoint: TalkingPoint = { id: generateId(), text, isCovered: false, confidence: 0 };
    const updated = [...points, newPoint];
    setPoints(updated);
    savePoints(updated);
  }

  function deletePoint(id: string) {
    const updated = points.filter(p => p.id !== id);
    setPoints(updated);
    savePoints(updated);
  }

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const coveredCount = points.filter(p => p.isCovered).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      {showSettings && (
        <SettingsPanel settings={settings} onSave={s => { setSettings(s); saveSettings(s); }} onClose={() => setShowSettings(false)} />
      )}
      {showContext && (
        <InterviewContextPanel context={context} onSave={c => { setContext(c); saveContext(c); }} onClose={() => setShowContext(false)} />
      )}

      <div className="w-full max-w-xl flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Interview Teleprompter</h1>
            {context.role && (
              <p className="text-sm text-blue-600 font-medium">{context.role}{context.company ? ` · ${context.company}` : ''}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">Add your talking points. The app will check them off as you speak.</p>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowContext(true)} title="Interview context"
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button onClick={() => setShowSettings(true)} title="Settings"
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <TalkingPointsEditor points={points} onAdd={addPoint} onDelete={deletePoint} />

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {active.error && <p className="text-red-500 text-sm">{active.error}</p>}
          {!settings.apiKey && (
            <p className="text-amber-600 text-sm">No matching API key set — open Settings to add one.</p>
          )}

          <button
            onClick={active.isListening ? handleStop : handleStart}
            className={`w-full py-3 rounded-lg text-white font-semibold transition-colors ${
              active.isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {active.isListening ? 'Stop Listening' : 'Start Listening'}
          </button>

          {/* Timer + progress */}
          {active.isListening && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')} elapsed
              </span>
              <span>{coveredCount}/{points.length} points covered</span>
            </div>
          )}

          {/* Coaching feedback */}
          {(feedback || feedbackLoading) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Coach</p>
              {feedbackLoading && !feedback
                ? <p className="text-sm text-blue-400 italic">Analyzing...</p>
                : <p className="text-sm text-blue-800">{feedback}</p>
              }
            </div>
          )}

          <LiveTranscript transcript={active.transcript} interimText={active.interimText} isListening={active.isListening} />
        </div>
      </div>
    </div>
  );
}
