import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoomsApi } from '../rooms/rooms-api';
import { devRoomsInterceptor } from './dev-rooms.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('Development room demonstrations', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideHttpClient(withInterceptors([errorInterceptor, devRoomsInterceptor])),
    provideHttpClientTesting(),
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('simulates pending without reaching the backend', async () => {
    const result = firstValueFrom(TestBed.inject(RoomsApi).joinRoom('000202', { deviceId: 'guest', name: 'Phone' }));
    await expect(result).resolves.toEqual({ kind: 'pending' });
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('simulates a real 409 normalized by errorInterceptor', async () => {
    const result = firstValueFrom(TestBed.inject(RoomsApi).joinRoom('000409', { deviceId: 'guest', name: 'Phone' }));
    await expect(result).rejects.toMatchObject({ kind: 'client', status: 409 });
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('returns the complete pending response from the contract', async () => {
    const response = await firstValueFrom(TestBed.inject(HttpClient).post(
      `${environment.apiBaseUrl}/rooms/000202/join`,
      { deviceId: 'guest', name: 'Phone' }, { observe: 'response' },
    ));
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ code: '000202', deviceId: 'guest', status: 'PENDING' });
  });

  it.each([
    ['GET', '/rooms/000202'], ['POST', '/rooms'], ['POST', '/rooms/123456/join'],
    ['POST', '/uploads/000409/join'],
  ])('passes through %s %s', async (method, path) => {
    const response = firstValueFrom(TestBed.inject(HttpClient).request(method, environment.apiBaseUrl + path));
    TestBed.inject(HttpTestingController).expectOne(environment.apiBaseUrl + path).flush({});
    await expect(response).resolves.toEqual({});
  });
});
