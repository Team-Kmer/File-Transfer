import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class DeviceIdentity {
  public static readonly STORAGE_KEY = 'file-transfer-device-id';

  public readonly deviceId = this.loadOrCreateDeviceId();

  public readonly name = defaultName(navigator.userAgent);

  private loadOrCreateDeviceId(): string {
    const deviceId = localStorage.getItem(DeviceIdentity.STORAGE_KEY);
    if (deviceId) {
      return deviceId;
    }
    const newDeviceId = crypto.randomUUID();
    localStorage.setItem(DeviceIdentity.STORAGE_KEY, newDeviceId);
    return newDeviceId;
  }

}

export function defaultName(userAgent: string): string {
  return `${browserName(userAgent)} on ${operatingSystemName(userAgent)}`;
}

function browserName(userAgent: string): string {
  if (userAgent.includes('Edg')) { return 'Edge'; }
  if (userAgent.includes('Chrome')) { return 'Chrome'; }
  if (userAgent.includes('Firefox')) { return 'Firefox'; }
  if (userAgent.includes('Safari')) { return 'Safari'; }
  return 'Browser';
}

function operatingSystemName(userAgent: string): string {
  if (userAgent.includes('Windows')) { return 'Windows'; }
  if (userAgent.includes('iPhone')) { return 'iOS'; }
  if (userAgent.includes('iPad')) { return 'iPadOS'; }
  if (userAgent.includes('Mac')) { return 'macOS'; }
  if (userAgent.includes('Android')) { return 'Android'; }
  if (userAgent.includes('Linux')) { return 'Linux'; }
  return 'Unknown OS';
}
