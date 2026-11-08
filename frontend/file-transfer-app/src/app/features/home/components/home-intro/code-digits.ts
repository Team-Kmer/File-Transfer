export function codeDigits(code: string): string[] {
  return Array.from(code.padEnd(6, ' ').slice(0, 6));
}

export function normalizeRoomCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}
