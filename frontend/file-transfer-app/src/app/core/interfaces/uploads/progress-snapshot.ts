export interface ProgressSnapshot {
  percent: number;
  sentBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  remainingSeconds: number | null;
  filledCells: number;
}
