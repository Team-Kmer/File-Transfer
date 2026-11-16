import { computeProgress } from './upload-progress';

describe('computeProgress', () => {
  it('reports acknowledged bytes, average speed, remaining time and filled cells', () => {
    expect(computeProgress(25, 100, 1000, 3000)).toEqual({
      sentBytes: 25, totalBytes: 100, percent: 25, filledCells: 25,
      bytesPerSecond: 12.5, remainingSeconds: 6,
    });
    expect(computeProgress(1, 3, 0, 1000).filledCells).toBe(33);
    expect(computeProgress(25, 100, 1000, 5000).remainingSeconds).toBe(12);
    expect(computeProgress(0, 100, 1000, 1000).remainingSeconds).toBeNull();
    expect(computeProgress(25, 100, 1000, 1000).bytesPerSecond).toBe(0);
    expect(computeProgress(0, 0, 0, 0).percent).toBe(0);
    expect(computeProgress(120, 100, 0, 1000).percent).toBe(100);
    expect(computeProgress(-10, 100, 0, 1000).sentBytes).toBe(0);
    expect(computeProgress(100, 100, 0, 1000).remainingSeconds).toBe(0);
  });
});
