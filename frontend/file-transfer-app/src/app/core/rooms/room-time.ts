export function remainingMs(expiresAt: string, now: number): number {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, expiry - now) : 0;
}

export function remainingTimeLabel(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const suffix = String(seconds % 60).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${suffix}`;
  }
  return `${minutes}:${suffix}`;
}
