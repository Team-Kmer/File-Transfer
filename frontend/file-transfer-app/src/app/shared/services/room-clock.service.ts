import { Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { remainingMs, remainingTimeLabel } from '../../core/rooms/room-time';

@Injectable()
export class RoomClock {
  public readonly now = signal(Date.now());

  private readonly clockSubscription = interval(1000)
    .pipe(takeUntilDestroyed())
    .subscribe(() => this.syncNow());

  public countdown(expiresAt: string): string {
    return remainingTimeLabel(remainingMs(expiresAt, this.now()));
  }

  public isExpired(expiresAt: string): boolean {
    return remainingMs(expiresAt, this.now()) === 0;
  }

  public syncNow(): void {
    this.now.set(Date.now());
  }
}
