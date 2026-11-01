import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, interval, Subscription } from 'rxjs';
import { AppError } from '../../../core/errors/app-error.model';
import { roomErrorMessage } from '../../../core/rooms/room-error-message';
import { RoomSessionService } from '../../../core/services/room-session.service';
import { remainingMs, remainingTimeLabel } from '../../../core/rooms/room-time';
import { isValidRoomCode } from '../../../core/rooms/room-code.validator';

@Injectable()
export class RoomWaitingService {
  private readonly roomSessionService = inject(RoomSessionService);
  private readonly destroyRefService = inject(DestroyRef);

  public readonly room = this.roomSessionService.room.asReadonly();
  public readonly now = signal(Date.now());
  public readonly isLoading = signal(false);
  public readonly error = signal('');

  public readonly remaining = computed(() => this.getRemainingMs());
  public readonly countdown = computed(() => this.getCountdown());
  public readonly statusLabel = computed(() => this.getStatusLabel());

  private readonly clockSubscription = interval(1000).pipe(takeUntilDestroyed())
    .subscribe(() => this.now.set(Date.now()));
  private roomSubscription: Subscription | undefined;

  public loadRoom(code: string): void {
    this.roomSubscription?.unsubscribe();
    if (!isValidRoomCode(code)) {
      this.error.set('Invalid room code');
      return;
    }
    this.isLoading.set(true);
    this.error.set('');
    this.roomSubscription = this.roomSessionService.loadRoom(code).pipe(
      takeUntilDestroyed(this.destroyRefService),
      finalize(() => this.isLoading.set(false)),
    ).subscribe({ error: (error: AppError) => this.error.set(roomErrorMessage(error)) });
  }

  private getRemainingMs(): number {
    return remainingMs(this.roomSessionService.expiresAt(), this.now());
  }

  private getCountdown(): string {
    return remainingTimeLabel(this.remaining());
  }

  private getStatusLabel(): string {
    if (this.isLoading()) {
      return 'Loading session…';
    }
    if (this.hasError()) {
      return 'Session unavailable';
    }
    return this.remaining() === 0 ? 'Session expired' : 'Waiting for a device…';
  }

  private hasError(): boolean {
    return this.error().length > 0;
  }
}
