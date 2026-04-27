import type { TalkingPoint, AppSettings } from '../types';

const POINTS_KEY = 'teleprompter_points';
const SETTINGS_KEY = 'teleprompter_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  recordingIntervalSec: 5,
  matchingIntervalSec: 10,
  apiBaseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: 'claude-3-5-haiku-20241022',
};

export function loadPoints(): TalkingPoint[] {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePoints(points: TalkingPoint[]): void {
  localStorage.setItem(POINTS_KEY, JSON.stringify(points));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
