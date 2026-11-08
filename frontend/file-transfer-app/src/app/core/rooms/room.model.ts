export interface Device {
  deviceId: string;
  name: string;
  joinedAt: string;
}

export interface DeviceRequest {
  deviceId: string;
  name: string;
}

export interface Room {
  code: string;
  createdAt: string;
  expiresAt: string;
  devices: Device[];
  hostDeviceId?: string;
  lastActivityAt?: string;
  maxDevices?: number;
}

export type JoinResult =
  | { kind: 'joined'; room: Room}
  | {kind: 'pending'};
