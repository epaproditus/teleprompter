import type { TalkingPoint } from '../types';

const KEY = 'teleprompter_points';

export function loadPoints(): TalkingPoint[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePoints(points: TalkingPoint[]): void {
  localStorage.setItem(KEY, JSON.stringify(points));
}
