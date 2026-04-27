export interface TalkingPoint {
  id: string;
  text: string;
  isCovered: boolean;
  coveredAt?: number;
  confidence: number;
}

export interface TimeMilestone {
  minuteMark: number;   // e.g. 5
  goal: string;         // e.g. "Should have finished intro and mentioned experience"
}

export interface InterviewContext {
  role: string;
  company: string;
  interviewType: string;  // e.g. "behavioral", "technical", "HR screen"
  notes: string;          // anything else — prep notes, things to avoid, etc.
  milestones: TimeMilestone[];
}

export interface AppSettings {
  recordingIntervalSec: number;
  matchingIntervalSec: number;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  apiType: 'anthropic' | 'openai';
  sttProvider: 'whisper' | 'deepgram';
  deepgramApiKey: string;
  deepgramKeyterms: string;
  feedbackIntervalSec: number;
}
