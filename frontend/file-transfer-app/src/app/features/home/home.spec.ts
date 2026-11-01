import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([{ path: 'room/:code', component: Home }]),
        provideHttpClient(), provideHttpClientTesting()],
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

  it('keeps creation visible and disabled until the next step', () => {
    const page = fixture.nativeElement as HTMLElement;
    const createButton = page.querySelector<HTMLButtonElement>('button[type="button"]');
    expect(createButton?.textContent).toBe('Create a session');
    expect(createButton?.disabled).toBe(true);
  });

  it('keeps both Phase 1 pages reachable through links', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('a[href="/send"]')?.textContent).toBe('Send');
    expect(page.querySelector('a[href="/receive"]')?.textContent).toBe('Receive');
  });

  it('explains the three steps in their order', () => {
    const page = fixture.nativeElement as HTMLElement;
    const headings = Array.from(page.querySelectorAll('ol h3'), (heading) => heading.textContent);
    expect(headings).toEqual(['Create a session', 'Join it', 'Send']);
  });

  it.each(['', '12345', '1234567', '12a456', '123 456', ' 123456', '１２３４５６'])(
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

  it.each([['482913', '/room/482913'], ['012345', '/room/012345'], ['000000', '/room/000000']])(
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
