import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  public async copy(value: string): Promise<boolean> {
    if (navigator.clipboard?.writeText === undefined) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }
}
