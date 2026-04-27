# Interview Teleprompter with AI Speech Recognition

## Current Status
**Stage: Core MVP working.** Transcription + semantic matching functional. Building interview context + LLM feedback next.

## How We're Building This (Workflow)
One feature at a time. Test it. Commit to git. Then move on. Never skip ahead.

```
Plan → Build one thing → Test it in browser → git commit → Repeat
```

## Immediate Next Steps
- [x] **Step 1** — Project scaffold (Vite + React + TypeScript + Tailwind)
- [x] **Step 2** — Dev server running at http://localhost:5173
- [x] **Step 3** — Talking points editor with localStorage
- [x] **Step 4** — Local Whisper transcription via relay server (continuous, no gaps)
- [x] **Step 5** — Semantic matching via configurable LLM API (Anthropic or OpenAI format)
- [x] **Step 6** — Settings panel (STT provider, intervals, API key/URL/model, feedback frequency)
- [x] **Step 7** — Interview context panel (role, company, interview type, notes, time milestones)
- [x] **Step 8** — LLM coaching feedback (runs on adjustable interval, uses context + progress)
- [ ] **Step 9** — AI-generated talking points (LLM suggests points from context, user edits before session)

---

## What This Is
A web app that displays your interview talking points and listens as you speak. AI decides in real-time whether you've covered each point and marks it with a checkmark. Think teleprompter + live checklist.

## Feasibility
**Completely feasible.** Real-time speech-to-text with sub-500ms latency is production-ready. Multiple providers support streaming transcription, and LLMs like Claude can detect paraphrased coverage of talking points.

---

## Architecture

```
┌─────────────────────┐
│   User Speaks       │
│  (Microphone)       │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────┐
│ Browser                      │
│ - Web Speech API (free/MVP)  │
│   OR                         │
│ - OpenAI Realtime via WebRTC │
│   (ephemeral token from      │
│    relay server)              │
└──────────┬───────────────────┘
           │ transcript text
           ▼
┌──────────────────────────────┐
│ Semantic Matching            │
│ Claude API: "Did they cover  │
│ any of these points?"        │
│ (called every ~10 seconds    │
│  with accumulated transcript)│
└──────────┬───────────────────┘
           │ matched point IDs
           ▼
┌──────────────────────────────┐
│ UI Update                    │
│ ✓ Point covered              │
│ ○ Point not yet mentioned    │
└──────────────────────────────┘
```

### Key Architecture Decision: Two STT Options

| | Web Speech API (Free) | OpenAI Realtime API |
|---|---|---|
| **Cost** | Free | ~$0.06/min audio input |
| **Accuracy** | Good (powered by Google) | Excellent |
| **Browser support** | Chrome/Edge only | All browsers (via WebRTC) |
| **Backend needed?** | No | Yes — lightweight relay server for ephemeral tokens |
| **Setup complexity** | Zero dependencies | Moderate |
| **Best for** | MVP, practice sessions | Production, interview day |

**Recommendation**: Start with Web Speech API for MVP (Phase 1). Add OpenAI Realtime as an upgrade path in Phase 2 if accuracy isn't sufficient.

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Build tool | **Vite** | Fast, modern — CRA is deprecated as of 2025 |
| Language | **TypeScript** | Type safety for talking points, transcript state |
| UI framework | **React 19** | Best ecosystem for real-time interactive UIs |
| Styling | **Tailwind CSS** | Rapid iteration on teleprompter layout |
| STT (MVP) | **Web Speech API** | Free, zero-config, built into Chrome |
| STT (upgrade) | **OpenAI Realtime API** | Higher accuracy, WebRTC-based |
| Semantic matching | **Claude API** | Excellent paraphrasing detection |
| State management | **React hooks (useReducer)** | Sufficient for this scale |

---

## Cost Estimate

| Component | Rate | 30-min session cost |
|-----------|------|---------------------|
| OpenAI Realtime audio input | ~$0.06/min | ~$1.80 |
| Claude API semantic checks (every 10s, ~180 calls) | ~$0.001/call | ~$0.18 |
| **Total per 30-min practice session** | | **~$2.00** |
| **With free Web Speech API instead** | | **~$0.18** (Claude only) |

---

## API Key Security

**Never put API keys in browser code.** Vite `VITE_*` env vars are bundled into client JS and visible to anyone.

- Claude API calls go through a relay server or serverless function
- Talking points are stored in localStorage (no backend needed for data)

---

## Interview-Day UX Considerations

- **Compact overlay mode**: Small floating window or sidebar
- **No distracting animations**: Checkmarks appear quietly, no pop-ups
- **Glanceable design**: Large text, high contrast, minimal scanning needed
- **Second monitor friendly**: Works well as a separate window
- **Muted colors**: Shouldn't catch the interviewer's eye if screen-sharing

---

## Data Structures

```typescript
interface TalkingPoint {
  id: string;
  text: string;
  isCovered: boolean;
  coveredAt?: number;
  confidence: number;
}

interface TranscriptChunk {
  timestamp: number;
  text: string;
  isFinal: boolean;
}
```

---

## File Structure

```
teleprompter/
├── src/
│   ├── components/
│   │   ├── TalkingPointsList.tsx   # Checklist display during session
│   │   ├── TalkingPointsEditor.tsx # Add/edit points before session
│   │   └── SessionControls.tsx     # Start/stop button
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts # Web Speech API wrapper
│   │   └── useSemanticMatcher.ts   # Claude API matching logic
│   ├── services/
│   │   └── storage.ts              # localStorage for talking points
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── server/                         # Relay server for Claude API calls
│   └── index.ts
├── plan.md
├── package.json
└── .env                            # Server-side only, NOT VITE_ prefixed
```

---

## Implementation Plan

### Phase 1: MVP (Current)

1. **Talking points UI** *(next)*
   - Text input to add a point, press Enter or click Add
   - List of points displayed below
   - Delete button per point
   - Saves to localStorage automatically

2. **Speech recognition**
   - Wrap browser Web Speech API
   - Show live transcript on screen
   - Start/stop button

3. **Claude semantic matching**
   - Relay server to proxy Claude API calls
   - Every ~10s, send transcript + uncovered points to Claude
   - Check off matched points in UI

### Phase 2: Polish

- Compact/overlay mode for interview day
- Tune Claude prompt accuracy
- Session history

### Phase 3: Nice-to-Haves

- Coverage percentage indicator
- Export transcript
- Practice mode with timer
- Dark mode
