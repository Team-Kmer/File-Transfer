export function sessionCodeLabel(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function invitationUrl(origin: string, code: string): string {
  return `${origin}/room/${code}`;
}

export function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}
