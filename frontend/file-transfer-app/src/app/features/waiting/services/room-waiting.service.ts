import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { AppError } from '../../../core/errors/app-error.model';
import { roomErrorMessage } from '../../../core/rooms/room-error-message';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { RoomClock } from '../../../shared/services/room-clock.service';
import { isValidRoomCode } from '../../../core/rooms/room-code.validator';

@Injectable()
export class RoomWaitingService {
  private readonly roomSessionService = inject(RoomSessionService);
  private readonly destroyRefService = inject(DestroyRef);
  private readonly roomClockService = inject(RoomClock);

  public readonly room = this.roomSessionService.room.asReadonly();
  public readonly isLoading = signal(false);
  public readonly error = signal('');

  public readonly isExpired = computed(() => this.isRoomExpired());
  public readonly displayError = computed(() => this.getDisplayError());
  public readonly countdown = computed(() => this.getCountdown());
  public readonly statusLabel = computed(() => this.getStatusLabel());

  private roomSubscription: Subscription | undefined;

  public loadRoom(code: string): void {
    this.roomSubscription?.unsubscribe();
    if (!isValidRoomCode(code)) {
      this.error.set('Invalid room code');
      return;
    }
    this.isLoading.set(true);
    this.error.set('');
    this.roomSubscription = this.roomSessionService
      .loadRoom(code)
      .pipe(
        takeUntilDestroyed(this.destroyRefService),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({ error: (error: AppError) => this.error.set(roomErrorMessage(error)) });
  }

  private getCountdown(): string {
    return this.roomClockService.countdown(this.roomSessionService.expiresAt());
  }

  private getStatusLabel(): string {
    if (this.isLoading()) {
      return 'Loading session…';
    }
    if (this.hasError()) {
      return 'Session unavailable';
    }
    return this.isExpired() ? 'Session expired' : 'Waiting for a device…';
  }

  private isRoomExpired(): boolean {
    return (
      this.room() !== null && this.roomClockService.isExpired(this.roomSessionService.expiresAt())
    );
  }

  private getDisplayError(): string {
    if (this.hasError()) {
      return this.error();
    }
    return this.isExpired() ? 'Unknown or expired code' : '';
  }

  private hasError(): boolean {
    return this.error().length > 0;
  }
}
