import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { JoinResult, Room } from './room.model';
import { map, Observable } from 'rxjs';
import { DeviceRequest } from '../interfaces/deviceRequest';

@Injectable({ providedIn: 'root' })
export class RoomsApi {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  public createRoom(device: DeviceRequest ): Observable<Room> {
    return this.httpClient.post<Room>(`${this.baseUrl}/rooms`, device);
  }

  public getRoom(code: string): Observable<Room> {
    return this.httpClient.get<Room>(`${this.baseUrl}/rooms/${code}`);
  }

  public joinRoom(code: string, device: DeviceRequest ): Observable<JoinResult> {
    return this.httpClient
      .post<Room>(`${this.baseUrl}/rooms/${code}/join`, device, { observe: 'response' })
      .pipe(
        map((response) => {
          if (response.status === 202) {
            return { kind: 'pending' };
          } else {
            return { kind: 'joined', room: response.body! };
          }
        }),
      );
  }
}
