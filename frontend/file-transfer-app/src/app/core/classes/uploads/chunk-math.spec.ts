import { chunkRange } from './chunk-math';

describe('chunkRange', () => {
  it('handles first, middle, partial, exact and smaller-than-chunk files', () => {
    expect(chunkRange(0, 5, 12)).toEqual({ start: 0, end: 5 });
    expect(chunkRange(1, 5, 12)).toEqual({ start: 5, end: 10 });
    expect(chunkRange(2, 5, 12)).toEqual({ start: 10, end: 12 });
    expect(chunkRange(1, 5, 10)).toEqual({ start: 5, end: 10 });
    expect(chunkRange(0, 5, 3)).toEqual({ start: 0, end: 3 });
  });
});
