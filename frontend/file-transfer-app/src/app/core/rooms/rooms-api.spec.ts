import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { Room } from './room.model';
import { RoomsApi } from './rooms-api';

describe('RoomsApi', () => {
  const device = { deviceId: 'ab39ee40-27a5-4bb0-bc34-35f903b51671', name: 'Chrome on Android' };
  const room: Room = {
    code: '012345', createdAt: '2026-11-01T10:00:00Z', expiresAt: '2026-11-01T16:00:00Z',
    devices: [{ ...device, joinedAt: '2026-11-01T10:00:00Z' }],
  };
  let service: RoomsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoomsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a room with the device identity in the POST body', async () => {
    const response = firstValueFrom(service.createRoom(device));
    const request = http.expectOne(`${environment.apiBaseUrl}/rooms`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(device);
    request.flush(room);
    expect(await response).toEqual(room);
  });

  it('retrieves the room by code', async () => {
    const response = firstValueFrom(service.getRoom('012345'));
    const request = http.expectOne(`${environment.apiBaseUrl}/rooms/012345`);
    expect(request.request.method).toBe('GET');
    request.flush(room);
    expect(await response).toEqual(room);
  });

  it('returns joined with the room for HTTP 200', async () => {
    const response = firstValueFrom(service.joinRoom('012345', device));
    const request = http.expectOne(`${environment.apiBaseUrl}/rooms/012345/join`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(device);
    request.flush(room, { status: 200, statusText: 'OK' });
    expect(await response).toEqual({ kind: 'joined', room });
  });

  it('returns pending for HTTP 202 even when the body contains no room', async () => {
    const response = firstValueFrom(service.joinRoom('012345', device));
    const request = http.expectOne(`${environment.apiBaseUrl}/rooms/012345/join`);
    request.flush({ status: 'PENDING' }, { status: 202, statusText: 'Accepted' });
    expect(await response).toEqual({ kind: 'pending' });
  });

  it.each([[409, 'Conflict'], [404, 'Not Found']])(
    'preserves HTTP %s as an AppError regardless of the API message', async (status, statusText) => {
      const response = firstValueFrom(service.joinRoom('012345', device));
      const assertion = expect(response).rejects.toEqual({ kind: 'client', status, message: 'Invalid request' });
      const request = http.expectOne(`${environment.apiBaseUrl}/rooms/012345/join`);
      request.flush({ message: 'Unrelated backend wording' }, { status, statusText });
      await assertion;
    },
  );
});
