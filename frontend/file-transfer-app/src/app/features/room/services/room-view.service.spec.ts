import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { RoomViewService } from './room-view.service';
import { RoomClock } from '../../../shared/services/room-clock.service';

describe('Room view lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    TestBed.configureTestingModule({ providers: [
      RoomClock, RoomViewService, provideHttpClient(), provideHttpClientTesting(),
    ] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('resets the countdown on a fresh response while keeping one timer', () => {
    const clock = vi.spyOn(globalThis, 'setInterval');
    const service = TestBed.inject(RoomViewService);
    const http = TestBed.inject(HttpTestingController);
    service.joinRoom('012345');
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345/join`).flush(room('2026-11-02T12:00:05Z'));
    vi.advanceTimersByTime(1000);
    expect(service.countdown()).toBe('0:04');
    service.refreshRoom();
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345`).flush(room('2026-11-02T12:00:20Z'));
    expect(service.countdown()).toBe('0:19');
    expect(clock).toHaveBeenCalledTimes(1);
    http.verify();
  });

  it('cancels the request and stops the clock on destruction', () => {
    const service = TestBed.inject(RoomViewService);
    service.joinRoom('012345');
    const request = TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/rooms/012345/join`);
    const clock = TestBed.inject(RoomClock);
    const now = clock.now();
    TestBed.resetTestingModule();
    expect(request.cancelled).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(clock.now()).toBe(now);
  });

  function room(expiresAt: string) {
    return { code: '012345', createdAt: '', expiresAt, devices: [] };
  }
});
