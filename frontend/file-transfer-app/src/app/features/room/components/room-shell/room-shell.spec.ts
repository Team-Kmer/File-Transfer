import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomShell } from './room-shell';

describe('RoomShell file-drop navigation guard', () => {
  let fixture: ComponentFixture<RoomShell>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(RoomShell);
    fixture.componentRef.setInput('room', { code: '012345', createdAt: '', expiresAt: '', devices: [] });
    fixture.componentRef.setInput('countdown', '01:00');
    fixture.componentRef.setInput('devices', []);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.inject(HttpTestingController).verify();
  });

  it.each(['dragover', 'drop'])('blocks file %s outside the drop zone only while joined', eventName => {
    const duringRoom = fileEvent(eventName);
    window.dispatchEvent(duringRoom);
    expect(duringRoom.defaultPrevented).toBe(true);
    fixture.destroy();
    const afterRoom = fileEvent(eventName);
    window.dispatchEvent(afterRoom);
    expect(afterRoom.defaultPrevented).toBe(false);
  });

  it('preserves the default behavior of non-file drags', () => {
    const event = new Event('dragover', { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['text/plain'] } });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  function fileEvent(name: string): Event {
    const event = new Event(name, { cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'] } });
    return event;
  }
});
