export interface TalkingPoint {
  id: string;
  text: string;
  isCovered: boolean;
  coveredAt?: number;
  confidence: number;
}
