import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { DeviceIdentity } from '../../../../core/device/device-identity';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { Room } from '../../../../core/rooms/room.model';
import { RoomPage } from './room-page';

describe('Room route', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const endpoint = `${environment.apiBaseUrl}/rooms/012345`;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'room/:code', component: RoomPage }, { path: '', component: RoomPage }]),
      provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('joins with the device identity, then displays devices and the empty files state', async () => {
    await harness.navigateByUrl('/room/012345');
    expect(page().textContent).toContain('Joining session');
    const request = http.expectOne(`${endpoint}/join`);
    const identity = TestBed.inject(DeviceIdentity);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ deviceId: identity.deviceId, name: identity.name });
    request.flush(room());
    await harness.fixture.whenStable();
    expect(page().textContent).toContain('Guest phone');
    expect(page().textContent).toContain('Session files');
    expect(page().textContent).toContain('No files yet');
    expect(page().querySelector<HTMLInputElement>('app-room-upload input[type=file]')?.disabled).toBe(false);
    expect(page().querySelector('.device-counter')).toBeNull();
  });

  it('shows the supplied capacity and refreshes devices and expiresAt using GET', async () => {
    await harness.navigateByUrl('/room/012345');
    http.expectOne(`${endpoint}/join`).flush({ ...room(), maxDevices: 3 });
    await harness.fixture.whenStable();
    expect(page().querySelector('.device-counter')?.textContent).toContain('1 / 3');
    page().querySelector<HTMLButtonElement>('.refresh-button')!.click();
    http.expectOne(endpoint).flush({ ...room(), devices: [], maxDevices: 3,
      expiresAt: new Date(Date.now() + 120000).toISOString() });
    await harness.fixture.whenStable();
    expect(page().querySelector('.device-counter')?.textContent).toContain('0 / 3');
    expect(page().textContent).toContain('No devices listed');
    expect(page().querySelector('.countdown')?.textContent).toContain('2:00');
  });

  it('shows a static approval screen for 202, without pretending to have joined', async () => {
    await harness.navigateByUrl('/room/012345');
    http.expectOne(`${endpoint}/join`).flush({ status: 'PENDING' }, { status: 202, statusText: 'Accepted' });
    await harness.fixture.whenStable();
    expect(page().textContent).toContain('Waiting for the host');
    expect(page().textContent).toContain(TestBed.inject(DeviceIdentity).name);
    expect(page().querySelector('app-room-shell')).toBeNull();
    page().querySelector<HTMLButtonElement>('.back-button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    http.expectNone(() => true);
  });

  it.each([
    [409, 'Session full'], [404, 'Unknown or expired code'], [500, 'Server error'],
    [0, 'Network error'],
  ])('maps status %s without relying on the backend message', async (status, message) => {
    await harness.navigateByUrl('/room/012345');
    http.expectOne(`${endpoint}/join`).flush({ message: 'Session full' }, { status, statusText: 'Failure' });
    await harness.fixture.whenStable();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(page().querySelector('.back-button')?.textContent).toContain('Back to home');
  });

  it.each(['123', '1234567', '12a456', '１２３４５６'])('rejects malformed URL %s without HTTP', async code => {
    await harness.navigateByUrl(`/room/${code}`);
    expect(page().textContent).toContain('Unknown or expired code');
    http.expectNone(() => true);
  });

  it('cancels the previous join when the URL code changes', async () => {
    await harness.navigateByUrl('/room/012345');
    const previous = http.expectOne(`${endpoint}/join`);
    await harness.navigateByUrl('/room/654321');
    expect(previous.cancelled).toBe(true);
    http.expectOne(`${environment.apiBaseUrl}/rooms/654321/join`).flush({ ...room(), code: '654321' });
    await harness.fixture.whenStable();
    expect(page().textContent).toContain('654321');
  });

  it('removes the room when its countdown expires', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    await harness.navigateByUrl('/room/012345');
    http.expectOne(`${endpoint}/join`).flush({ ...room(), expiresAt: '2026-11-02T12:00:01Z' });
    await harness.fixture.whenStable();
    expect(page().querySelector('app-room-shell')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    await harness.fixture.whenStable();
    expect(page().textContent).toContain('Unknown or expired code');
    expect(page().querySelector('app-room-shell')).toBeNull();
  });

  function page(): HTMLElement { return harness.routeNativeElement!; }
  function room(): Room {
    return { code: '012345', createdAt: '', expiresAt: new Date(Date.now() + 60000).toISOString(),
      devices: [{ deviceId: 'guest', name: 'Guest phone', joinedAt: '' }] };
  }
  it('clears upload state when switching room codes on the same route', async () => {
    await joinInitialRoom();
    const pendingChunk = beginRoomUpload();
    await harness.navigateByUrl('/room/654321');
    expect(pendingChunk.cancelled).toBe(true);
    const cleanup = http.expectOne({ method: 'DELETE', url: `${environment.apiBaseUrl}/files/upload/old-upload` });
    http.expectOne(`${environment.apiBaseUrl}/rooms/654321/join`).flush({ ...room(), code: '654321' });
    await harness.fixture.whenStable();
    cleanup.flush(null);
    await harness.fixture.whenStable();
    expect(page().querySelector('[role=progressbar]')).toBeNull();
    expect(page().textContent).not.toContain('cancel-me.bin');
    expect(page().textContent).not.toContain('Upload cancelled.');
  });

  async function joinInitialRoom(): Promise<void> {
    await harness.navigateByUrl('/room/012345');
    http.expectOne(`${endpoint}/join`).flush(room());
    await harness.fixture.whenStable();
  }

  function beginRoomUpload(): TestRequest {
    const input = page().querySelector<HTMLInputElement>('app-room-upload input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [new File(['abcdefghij'], 'cancel-me.bin')] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const uploadEndpoint = `${environment.apiBaseUrl}/files/upload`;
    http.expectOne(`${uploadEndpoint}/init`).flush({ uploadId: 'old-upload', chunkSize: 5, totalChunks: 2 });
    http.expectOne(`${uploadEndpoint}/old-upload/chunks/0`).flush({ status: 'IN_PROGRESS' });
    return http.expectOne(`${uploadEndpoint}/old-upload/chunks/1`);
  }

});
