import { invitationUrl, isLoopbackHostname, sessionCodeLabel } from './invitation';

describe('invitation presentation', () => {
  it('groups a code without losing the leading zero', () => {
    expect(sessionCodeLabel('012345')).toBe('012 345');
  });

  it('uses the current LAN origin rather than the backend address', () => {
    expect(invitationUrl('http://192.168.1.24:4200', '012345'))
      .toBe('http://192.168.1.24:4200/room/012345');
  });

  it.each([['localhost', true], ['127.0.0.1', true], ['[::1]', true], ['192.168.1.24', false]])(
    'detects whether %s needs the localhost warning', (hostname, isLoopback) => {
      expect(isLoopbackHostname(hostname)).toBe(isLoopback);
    },
  );
});
