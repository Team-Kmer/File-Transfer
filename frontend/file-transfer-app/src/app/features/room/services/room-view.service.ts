import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { DeviceIdentity } from '../../../core/device/device-identity';
import { AppError } from '../../../core/errors/app-error.model';
import { isValidRoomCode } from '../../../core/rooms/room-code.validator';
import { roomErrorMessage } from '../../../core/rooms/room-error-message';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { RoomClock } from '../../../shared/services/room-clock.service';
import { JoinResult, Room } from '../../../core/rooms/room.model';
import { RoomsApi } from '../../../core/rooms/rooms-api';
import { RoomViewState } from '../interfaces/room-view-state';
import { RoomDevice } from '../interfaces/room-device';
import { presentRoomDevices } from './room-presentation';

@Injectable()
export class RoomViewService {
  private readonly roomsApiService = inject(RoomsApi);
  private readonly deviceIdentityService = inject(DeviceIdentity);
  private readonly roomSessionService = inject(RoomSessionService);
  private readonly destroyRefService = inject(DestroyRef);
  private readonly roomClockService = inject(RoomClock);

  public readonly deviceId = this.deviceIdentityService.deviceId;
  public readonly deviceName = this.deviceIdentityService.name;
  private readonly viewState = signal<RoomViewState>({ kind: 'loading' });

  public readonly state = computed(() => this.getState());
  public readonly countdown = computed(() => this.getCountdown());
  public readonly statusLabel = computed(() => this.getStatusLabel());
  public readonly devices = computed(() => this.getDevices());

  private requestSubscription: Subscription | undefined;

  public joinRoom(code: string): void {
    this.requestSubscription?.unsubscribe();
    this.roomSessionService.clearRoom();
    if (!isValidRoomCode(code)) {
      this.viewState.set({ kind: 'notFound' });
      return;
    }
    this.viewState.set({ kind: 'loading' });
    const device = { deviceId: this.deviceId, name: this.deviceName };
    this.requestSubscription = this.roomsApiService.joinRoom(code, device)
      .pipe(takeUntilDestroyed(this.destroyRefService))
      .subscribe({
        next: result => this.receiveJoinResult(code, result),
        error: (error: AppError) => this.receiveError(error),
      });
  }

  public refreshRoom(): void {
    const state = this.state();
    if (!this.isJoinedRoom(state)) { return; }
    this.requestSubscription?.unsubscribe();
    this.requestSubscription = this.roomsApiService.getRoom(state.room.code)
      .pipe(takeUntilDestroyed(this.destroyRefService))
      .subscribe({
        next: room => this.receiveRoom(room),
        error: (error: AppError) => this.receiveError(error),
      });
  }

  public clearRoom(): void {
    this.requestSubscription?.unsubscribe();
    this.roomSessionService.clearRoom();
  }

  private receiveJoinResult(code: string, result: JoinResult): void {
    if (this.isPendingResult(result)) {
      this.viewState.set({ kind: 'pending', code });
      return;
    }
    this.receiveRoom(result.room);
  }

  private receiveRoom(room: Room): void {
    this.roomClockService.syncNow();
    this.roomSessionService.receiveRoom(room);
    this.viewState.set({ kind: 'room', room });
  }

  private receiveError(error: AppError): void {
    if (this.isFullError(error)) {
      this.viewState.set({ kind: 'full' });
    } else if (this.isNotFoundError(error)) {
      this.viewState.set({ kind: 'notFound' });
    } else {
      this.viewState.set({ kind: 'error', message: roomErrorMessage(error) });
    }
  }

  private getState(): RoomViewState {
    const state = this.viewState();
    return this.hasExpiredRoom(state) ? { kind: 'notFound' } : state;
  }

  private getCountdown(): string {
    return this.roomClockService.countdown(this.roomSessionService.expiresAt());
  }

  private getDevices(): RoomDevice[] {
    const state = this.state();
    return this.isJoinedRoom(state) ? presentRoomDevices(state.room.devices, this.deviceId) : [];
  }

  private isJoinedRoom(state: RoomViewState): state is Extract<RoomViewState, { kind: 'room' }> {
    return state.kind === 'room';
  }

  private isPendingResult(result: JoinResult): result is Extract<JoinResult, { kind: 'pending' }> {
    return result.kind === 'pending';
  }

  private hasExpiredRoom(state: RoomViewState): boolean {
    return this.isJoinedRoom(state) && this.roomClockService.isExpired(state.room.expiresAt);
  }

  private isFullError(error: AppError): boolean { return error.status === 409; }
  private isNotFoundError(error: AppError): boolean { return error.status === 404; }

  private getStatusLabel(): string {
    switch (this.state().kind) {
      case 'room': return 'Session joined';
      case 'pending': return 'Waiting for the host';
      case 'loading': return 'Joining session…';
      default: return 'Session unavailable';
    }
  }
}
