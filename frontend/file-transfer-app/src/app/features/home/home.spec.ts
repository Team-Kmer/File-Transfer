import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { Home } from './home';
import { DeviceIdentity } from '../../core/device/device-identity';
import { errorInterceptor } from '../../core/interceptors/error.interceptor';
import { environment } from '../../../environments/environment';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([
        { path: 'room/:code', component: Home }, { path: 'room/:code/waiting', component: Home },
      ]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the room code field immediately on arrival', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('input[name="roomCode"]')).not.toBeNull();
    expect(getRoomCodeInput().getAttribute('aria-invalid')).toBe('false');
    expect(page.querySelector('label')?.textContent).toBe('Join with a code');
  });

  it('enables session creation on arrival', () => {
    const page = fixture.nativeElement as HTMLElement;
    const createButton = Array.from(page.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Create a session');
    expect(createButton).toBeDefined();
    expect(createButton?.disabled).toBe(false);
  });

  it('creates one room with device identity and opens its waiting route', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.create-button');
    button.click();
    button.click();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/rooms`);
    expect(request.request.method).toBe('POST');
    const identity = TestBed.inject(DeviceIdentity);
    expect(request.request.body).toEqual({ deviceId: identity.deviceId, name: identity.name });
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    request.flush({ code: '012345', createdAt: '2026-11-02T12:00:00Z', expiresAt: '2026-11-02T18:00:00Z', devices: [] });
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/room/012345/waiting');
  });

  it('shows a status-based creation error and enables retry', async () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.create-button');
    button.click();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/rooms`)
      .flush({ message: 'misleading message' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.creation-error').textContent).toContain('Server error');
    expect(button.disabled).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('keeps both Phase 1 pages reachable through links', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('a[href="/send"]')?.textContent).toBe('Send');
    expect(page.querySelector('a[href="/receive"]')?.textContent).toBe('Receive');
  });

  it('opens the Phase 1 menu and closes it with Escape', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const toggle = page.querySelector<HTMLButtonElement>('[aria-controls="home-menu"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.querySelector('#home-menu a[href="/send"]')).not.toBeNull();
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('explains the three steps in their order', () => {
    const page = fixture.nativeElement as HTMLElement;
    const headings = Array.from(page.querySelectorAll('ol h3'), (heading) => heading.textContent);
    expect(headings).toEqual(['Create a session', 'Join it', 'Send']);
  });

  it('closes the menu when toggled a second time', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const toggle = page.querySelector<HTMLButtonElement>('[aria-controls="home-menu"]')!;
    toggle.click();
    await fixture.whenStable();
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it.each(['', '12345', '12a456', '１２３４５６'])(
    'rejects malformed code "%s" inline without HTTP or navigation', async (code) => {
      enterRoomCode(code);
      await submitJoin();
      expect(getRoomCodeInput().getAttribute('aria-invalid')).toBe('true');
      expect(fixture.nativeElement.querySelector('#room-code-feedback').textContent)
        .toContain('Enter exactly 6 digits.');
      expect(TestBed.inject(Router).url).toBe('/');
      TestBed.inject(HttpTestingController).expectNone(() => true);
    },
  );

  it.each([
    ['482913', '/room/482913'], ['012345', '/room/012345'], ['000000', '/room/000000'],
    ['1234567', '/room/123456'], ['123 456', '/room/123456'], [' 123456', '/room/123456'],
  ])(
    'navigates with valid code "%s" without joining through HTTP', async (code, expectedUrl) => {
      enterRoomCode(code);
      await submitJoin();
      expect(TestBed.inject(Router).url).toBe(expectedUrl);
      expect(getRoomCodeInput().getAttribute('aria-invalid')).toBe('false');
      TestBed.inject(HttpTestingController).expectNone(() => true);
    },
  );

  it('clears the inline error when corrected without navigating before submission', async () => {
    enterRoomCode('123');
    await submitJoin();
    enterRoomCode('482913');
    await fixture.whenStable();
    expect(getRoomCodeInput().getAttribute('aria-invalid')).toBe('false');
    expect(fixture.nativeElement.querySelector('#room-code-feedback').textContent)
      .toContain('Enter the 6-digit code shown on the other device.');
    expect(TestBed.inject(Router).url).toBe('/');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  function getRoomCodeInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[name="roomCode"]');
  }

  function enterRoomCode(code: string): void {
    const input = getRoomCodeInput();
    input.value = code;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function submitJoin(): Promise<void> {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }
});
