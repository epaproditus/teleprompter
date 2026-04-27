import { useState, useEffect, useCallback, useRef } from 'react';
import type { TalkingPoint, AppSettings, InterviewContext, ScriptSection } from './types';
import { loadPoints, savePoints, loadSettings, saveSettings, loadContext, saveContext } from './services/storage';
import TalkingPointsEditor from './components/TalkingPointsEditor';
import LiveTranscript from './components/LiveTranscript';
import SettingsPanel from './components/SettingsPanel';
import InterviewContextPanel from './components/InterviewContextPanel';
import ScriptView from './components/ScriptView';
import DragHandle from './components/DragHandle';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDeepgramTranscription } from './hooks/useDeepgramTranscription';
import { useSemanticMatcher } from './hooks/useSemanticMatcher';
import { useCoachingFeedback } from './hooks/useCoachingFeedback';
import { useScriptTracker } from './hooks/useScriptTracker';

const LAYOUT_KEY = 'teleprompter_layout';

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) : { scriptW: 380, coachW: 220 };
  } catch {
    return { scriptW: 380, coachW: 220 };
  }
}

function saveLayout(layout: { scriptW: number; coachW: number }) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

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
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>(context.scriptSections ?? []);
  const [layout, setLayout] = useState(loadLayout);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const whisper = useSpeechRecognition(settings.recordingIntervalSec);
  const deepgram = useDeepgramTranscription();
  const active = settings.sttProvider === 'deepgram' ? deepgram : whisper;

  const handleStart = useCallback(() => {
    setElapsedSeconds(0);
    // Reset script section state
    setScriptSections(prev => prev.map(s => ({ ...s, isActive: false, isCovered: false })));
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

  const handleContextSave = useCallback((c: InterviewContext) => {
    setContext(c);
    setScriptSections(c.scriptSections ?? []);
    saveContext(c);
  }, []);

  useSemanticMatcher({ transcript: active.transcript, points, settings, isListening: active.isListening, onCover: handleCover });

  useScriptTracker({
    transcript: active.transcript,
    sections: scriptSections,
    settings,
    isListening: active.isListening,
    onUpdate: setScriptSections,
  });

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

  function replacePoints(texts: string[]) {
    const updated = texts.map(text => ({ id: generateId(), text, isCovered: false, confidence: 0 }));
    setPoints(updated);
    savePoints(updated);
  }

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const coveredCount = points.filter(p => p.isCovered).length;
  const hasScript = scriptSections.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-8 px-4">
      {showSettings && (
        <SettingsPanel settings={settings} onSave={s => { setSettings(s); saveSettings(s); }} onClose={() => setShowSettings(false)} />
      )}
      {showContext && (
        <InterviewContextPanel context={context} settings={settings} onSave={handleContextSave} onClose={() => setShowContext(false)} />
      )}

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Teleprompter</h1>
            {context.role && (
              <p className="text-sm text-blue-600 font-medium">{context.role}{context.company ? ` · ${context.company}` : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {active.isListening && (
              <span className="text-sm text-gray-500">
                {String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')} &nbsp;·&nbsp; {coveredCount}/{points.length} covered
              </span>
            )}
            <button onClick={() => setShowContext(true)} title="Interview context" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button onClick={() => setShowSettings(true)} title="Settings" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main layout — resizable columns */}
        <div className="flex items-start" style={{ height: 'calc(100vh - 10rem)' }}>

          {/* Script panel */}
          {hasScript && (
            <>
              <div
                className="flex-shrink-0 h-full overflow-y-auto pr-2"
                style={{ width: layout.scriptW }}
              >
                <ScriptView sections={scriptSections} />
              </div>
              <DragHandle onDrag={delta => {
                setLayout(prev => {
                  const next = { ...prev, scriptW: Math.max(200, Math.min(800, prev.scriptW + delta)) };
                  saveLayout(next);
                  return next;
                });
              }} />
            </>
          )}

          {/* Center: talking points + controls */}
          <div className="flex-1 flex flex-col gap-5 min-w-0 h-full overflow-y-auto px-2">
            <TalkingPointsEditor
              points={points}
              settings={settings}
              context={context}
              onAdd={addPoint}
              onDelete={deletePoint}
              onReplace={replacePoints}
            />
            <div className="flex flex-col gap-3">
              {active.error && <p className="text-red-500 text-sm">{active.error}</p>}
              {!settings.apiKey && (
                <p className="text-amber-600 text-sm">No API key set — open Settings to add one.</p>
              )}
              <button
                onClick={active.isListening ? handleStop : handleStart}
                className={`w-full py-3 rounded-lg text-white font-semibold transition-colors ${
                  active.isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {active.isListening ? 'Stop Listening' : 'Start Listening'}
              </button>
              <LiveTranscript transcript={active.transcript} interimText={active.interimText} isListening={active.isListening} />
            </div>
          </div>

          {/* Drag handle before coach */}
          <DragHandle onDrag={delta => {
            setLayout(prev => {
              const next = { ...prev, coachW: Math.max(150, Math.min(500, prev.coachW - delta)) };
              saveLayout(next);
              return next;
            });
          }} />

          {/* Coaching sidebar */}
          <div
            className="flex-shrink-0 flex flex-col gap-3 h-full overflow-y-auto pl-2"
            style={{ width: layout.coachW }}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Coach</p>

            {feedbackLoading && feedback.length === 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-sm text-blue-300 italic">Analyzing...</p>
              </div>
            )}

            {feedback.map((note, i) => {
              const isWarning = /off.?topic|behind|missing|slow|too (much|long|detail)|avoid|red flag/i.test(note);
              const isGood = /good|great|on track|perfect|strong|nice/i.test(note);
              return (
                <div key={i} className={`rounded-xl px-3 py-2.5 border text-base font-medium ${
                  isWarning ? 'bg-red-50 border-red-200 text-red-700'
                  : isGood ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  {note}
                </div>
              );
            })}

            {!active.isListening && feedback.length === 0 && (
              <p className="text-sm text-gray-400">Coaching tips appear here once you start.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
