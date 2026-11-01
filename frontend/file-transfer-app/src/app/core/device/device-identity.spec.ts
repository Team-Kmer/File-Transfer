import { defaultName, DeviceIdentity } from './device-identity';

describe('DeviceIdentity', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('generates and persists a UUID on first access', () => {
    const identity = new DeviceIdentity();
    expect(identity.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem(DeviceIdentity.STORAGE_KEY)).toBe(identity.deviceId);
  });

  it('reuses the same id in a second instance', () => {
    const first = new DeviceIdentity();
    expect(new DeviceIdentity().deviceId).toBe(first.deviceId);
  });

  it('reuses an existing stored id unchanged', () => {
    localStorage.setItem(DeviceIdentity.STORAGE_KEY, 'existing-device-id');
    expect(new DeviceIdentity().deviceId).toBe('existing-device-id');
  });
});

describe('defaultName', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', 'Chrome on Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'Safari on iOS'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', 'Safari on iPadOS'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0', 'Edge on Windows'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0', 'Firefox on Linux'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'Safari on macOS'],
    ['unrecognized-agent', 'Browser on Unknown OS'],
  ])('names "%s" as "%s"', (userAgent, expected) => {
    expect(defaultName(userAgent)).toBe(expected);
  });
});
