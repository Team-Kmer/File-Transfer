export function isRetryable(status: number | undefined): boolean {
  return status === 0 || (status !== undefined && status >= 500);
}

export function retryDelayMs(attempt: number): number {
  return 500 * 2 ** (attempt - 1);
}
