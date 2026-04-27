export interface TalkingPoint {
  id: string;
  text: string;
  isCovered: boolean;
  coveredAt?: number;
  confidence: number;
}

export interface AppSettings {
  recordingIntervalSec: number;   // how often audio is sent to Whisper
  matchingIntervalSec: number;    // how often transcript is checked against points
  apiBaseUrl: string;             // Anthropic-compatible base URL
  apiKey: string;
  model: string;
}
