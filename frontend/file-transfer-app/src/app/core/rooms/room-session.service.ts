import { inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, Observable, of, tap } from 'rxjs';
import { DeviceIdentity } from '../device/device-identity';
import { AppError } from '../errors/app-error.model';
import { Room } from './room.model';
import { roomErrorMessage } from './room-error-message';
import { RoomsApi } from './rooms-api';

@Injectable({ providedIn: 'root' })
export class RoomSessionService {
  private readonly roomsApiService = inject(RoomsApi);
  private readonly deviceIdentityService = inject(DeviceIdentity);

  public readonly room = signal<Room | null>(null);
  public readonly expiresAt = signal('');
  public readonly isCreating = signal(false);
  public readonly creationError = signal('');

  public createRoom(): Observable<Room> {
    if (this.isCreating()) {
      return EMPTY;
    }
    this.isCreating.set(true);
    this.creationError.set('');
    const { deviceId, name } = this.deviceIdentityService;
    return this.roomsApiService.createRoom({ deviceId, name }).pipe(
      tap((room) => this.receiveRoom(room)),
      catchError((error: AppError) => this.handleCreationError(error)),
      finalize(() => this.isCreating.set(false)),
    );
  }

  public loadRoom(code: string): Observable<Room> {
    const room = this.room();
    if (this.hasCachedRoom(room, code)) {
      return of(room);
    }
    this.clearRoom();
    return this.roomsApiService.getRoom(code).pipe(tap((received) => this.receiveRoom(received)));
  }

  public receiveRoom(room: Room): void {
    this.room.set(room);
    this.expiresAt.set(room.expiresAt);
  }

  public clearRoom(): void {
    this.room.set(null);
    this.expiresAt.set('');
  }

  private handleCreationError(error: AppError): Observable<never> {
    this.creationError.set(roomErrorMessage(error));
    return EMPTY;
  }

  private hasCachedRoom(room: Room | null, code: string): room is Room {
    return room !== null && room.code === code;
  }
}
