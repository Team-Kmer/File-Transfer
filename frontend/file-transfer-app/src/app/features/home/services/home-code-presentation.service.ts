import { Injectable } from '@angular/core';

@Injectable()
export class HomeCodePresentationService {
  public getCodeDigits(code: string): string[] {
    return Array.from(code.padEnd(6, ' ').slice(0, 6));
  }
}
