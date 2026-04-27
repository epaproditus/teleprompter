export interface TalkingPoint {
  id: string;
  text: string;
  isCovered: boolean;
  coveredAt?: number;
  confidence: number;
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  isCovered: boolean;
}

export interface TimeMilestone {
  minuteMark: number;   // e.g. 5
  goal: string;         // e.g. "Should have finished intro and mentioned experience"
}

export interface InterviewContext {
  role: string;
  company: string;
  interviewType: string;
  notes: string;
  milestones: TimeMilestone[];
  script: string;
  scriptSections: ScriptSection[];
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
