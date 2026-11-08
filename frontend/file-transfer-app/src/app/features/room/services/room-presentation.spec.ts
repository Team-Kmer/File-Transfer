import { presentRoomDevices } from './room-presentation';

describe('Room device presentation', () => {
  it('identifies this device and keeps the other names unchanged', () => {
    const devices = [
      { deviceId: 'self', name: 'Chrome on Windows', joinedAt: '' },
      { deviceId: 'guest', name: 'Phone', joinedAt: '' },
    ];
    expect(presentRoomDevices(devices, 'self').map(device => device.displayName))
      .toEqual(['Chrome on Windows (you)', 'Phone']);
    expect(devices[0].name).toBe('Chrome on Windows');
  });

  it('keeps an empty device list empty', () => {
    expect(presentRoomDevices([], 'self')).toEqual([]);
  });
});
