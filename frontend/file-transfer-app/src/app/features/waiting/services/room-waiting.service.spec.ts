import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { RoomWaitingService } from './room-waiting.service';
import { environment } from '../../../../environments/environment';

describe('RoomWaitingService clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    TestBed.configureTestingModule({
      providers: [RoomWaitingService, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('uses one timer when a response replaces expiresAt', () => {
    const clock = vi.spyOn(globalThis, 'setInterval');
    const service = TestBed.inject(RoomWaitingService);
    const session = TestBed.inject(RoomSessionService);
    session.receiveRoom({ code: '012345', createdAt: '', expiresAt: '2026-11-02T12:00:05Z', devices: [] });
    expect(service.countdown()).toBe('0:05');
    expect(clock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(service.countdown()).toBe('0:04');
    session.receiveRoom({ code: '012345', createdAt: '', expiresAt: '2026-11-02T12:00:20Z', devices: [] });
    expect(service.countdown()).toBe('0:19');
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('stops updating time when destroyed', () => {
    const service = TestBed.inject(RoomWaitingService);
    const now = service.now();
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(2000);
    expect(service.now()).toBe(now);
  });

  it('clamps the countdown to zero and shows an expired state', () => {
    const service = TestBed.inject(RoomWaitingService);
    TestBed.inject(RoomSessionService).receiveRoom({
      code: '012345', createdAt: '', expiresAt: '2026-11-02T12:00:01Z', devices: [],
    });
    vi.advanceTimersByTime(2000);
    expect(service.countdown()).toBe('0:00');
    expect(service.statusLabel()).toBe('Session expired');
  });

  it('cancels an older request when the route code changes', () => {
    const service = TestBed.inject(RoomWaitingService);
    const http = TestBed.inject(HttpTestingController);
    service.loadRoom('012345');
    const previous = http.expectOne(`${environment.apiBaseUrl}/rooms/012345`);
    service.loadRoom('654321');
    expect(previous.cancelled).toBe(true);
    http.expectOne(`${environment.apiBaseUrl}/rooms/654321`).flush({
      code: '654321', createdAt: '', expiresAt: '2026-11-02T13:00:00Z', devices: [],
    });
    expect(service.room()?.code).toBe('654321');
    expect(service.error()).toBe('');
    expect(service.isLoading()).toBe(false);
    http.verify();
  });
});
