import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class DeviceIdentity {
  public static readonly STORAGE_KEY = 'file-transfer-device-id';

  public readonly deviceId = this.loadOrCreateDeviceId();

  readonly name = this.defaultName(navigator.userAgent);

  private loadOrCreateDeviceId(): string {
    const deviceId = localStorage.getItem(DeviceIdentity.STORAGE_KEY);
    if (deviceId) {
      return deviceId;
    }
    const newDeviceId = crypto.randomUUID();
    localStorage.setItem(DeviceIdentity.STORAGE_KEY, newDeviceId);
    return newDeviceId;
  }

  private defaultName(userAgent: string): string {
    let browser = 'Browser';
    if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';

    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('iPhone')) os = 'iOS';
    else if (userAgent.includes('iPad')) os = 'iPadOS';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
  }
}
