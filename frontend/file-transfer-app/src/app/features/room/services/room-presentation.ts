import { Device } from '../../../core/rooms/room.model';
import { RoomDevice } from '../interfaces/room-device';

export function presentRoomDevices(devices: Device[], currentDeviceId: string): RoomDevice[] {
  return devices.map(device => ({
    ...device,
    displayName: device.deviceId === currentDeviceId ? `${device.name} (you)` : device.name,
  }));
}
