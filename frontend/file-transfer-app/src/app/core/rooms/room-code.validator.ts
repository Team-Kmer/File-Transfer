export function isValidRoomCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}
