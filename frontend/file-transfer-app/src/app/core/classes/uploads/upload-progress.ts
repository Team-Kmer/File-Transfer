import { ProgressSnapshot } from '../../interfaces/uploads/progress-snapshot';

export function computeProgress(
  sentBytes: number, totalBytes: number, startedAt: number, now: number,
): ProgressSnapshot {
  const total = Math.max(0, totalBytes);
  const sent = Math.min(total, Math.max(0, sentBytes));
  const seconds = Math.max(0, now - startedAt) / 1000;
  const bytesPerSecond = seconds > 0 ? sent / seconds : 0;
  const percent = total > 0 ? sent / total * 100 : 0;
  return {
    sentBytes: sent, totalBytes: total, percent, filledCells: Math.floor(percent),
    bytesPerSecond, remainingSeconds: bytesPerSecond > 0 ? (total - sent) / bytesPerSecond : null,
  };
}
