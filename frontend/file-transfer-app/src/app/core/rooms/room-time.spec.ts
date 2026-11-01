import { remainingMs, remainingTimeLabel } from './room-time';

describe('room expiry', () => {
  it.each([
    ['2026-11-02T12:00:05Z', 1793620800000, 5000],
    ['2026-11-02T12:00:00Z', 1793620800000, 0],
    ['2026-11-02T11:59:00Z', 1793620800000, 0],
    ['invalid', 1793620800000, 0],
  ])('computes the remaining milliseconds for %s', (expiresAt, now, expected) => {
    expect(remainingMs(expiresAt, now)).toBe(expected);
  });

  it.each([[0, '0:00'], [1, '0:01'], [61400, '1:02'], [21600000, '6:00:00'], [86400000, '24:00:00']])(
    'formats %s milliseconds without assuming a 30-minute lifetime', (milliseconds, expected) => {
      expect(remainingTimeLabel(milliseconds)).toBe(expected);
    },
  );
});
