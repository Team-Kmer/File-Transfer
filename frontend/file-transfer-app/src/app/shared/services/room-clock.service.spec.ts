import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoomClock } from './room-clock.service';

describe('RoomClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    TestBed.configureTestingModule({ providers: [RoomClock] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('tracks a replaced expiry with one timer and stops when destroyed', () => {
    const timer = vi.spyOn(globalThis, 'setInterval');
    const clock = TestBed.inject(RoomClock);
    const expiresAt = signal('2026-11-02T12:00:05Z');
    const countdown = computed(() => clock.countdown(expiresAt()));
    expect(countdown()).toBe('0:05');
    vi.advanceTimersByTime(1000);
    expect(countdown()).toBe('0:04');
    expiresAt.set('2026-11-02T12:00:20Z');
    expect(countdown()).toBe('0:19');
    expect(clock.isExpired(expiresAt())).toBe(false);
    expect(timer).toHaveBeenCalledTimes(1);
    const now = clock.now();
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(20000);
    expect(clock.now()).toBe(now);
  });
});
