import { isRetryable, retryDelayMs } from './retry-policy';

describe('chunk retry policy', () => {
  it('retries network/server failures with the three contract backoffs', () => {
    expect([0, 500, 503, 599].map(isRetryable)).toEqual([true, true, true, true]);
    expect([undefined, 400, 404, 409, 413, 415].map(isRetryable)).toEqual(
      [false, false, false, false, false, false],
    );
    expect([1, 2, 3].map(retryDelayMs)).toEqual([500, 1000, 2000]);
  });
});
