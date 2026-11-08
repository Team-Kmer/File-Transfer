import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { environment } from '../../../../../environments/environment';
import { Home } from '../../../home/home';
import { Waiting } from './waiting';

describe('Creation and waiting screen', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: '', component: Home },
        { path: 'room/:code/waiting', component: Waiting },
      ]),
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

  it('creates, shows the invitation, then cancels without deleting the room', async () => {
    await harness.navigateByUrl('/');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.create-button')!.click();
    http.expectOne(`${environment.apiBaseUrl}/rooms`).flush(room());
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/room/012345/waiting');
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('.session-code')!.value).toBe('012 345');
    http.expectNone(`${environment.apiBaseUrl}/rooms/012345`);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.cancel-button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    http.expectNone(request => request.method === 'DELETE');
  });

  it('loads an existing room when the waiting URL is opened directly', async () => {
    await harness.navigateByUrl('/room/012345/waiting');
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345`).flush(room());
    await harness.fixture.whenStable();
    const link = harness.routeNativeElement!.querySelector<HTMLInputElement>('.lan-link')!;
    expect(link.value).toBe(`${location.origin}/room/012345`);
    expect(harness.routeNativeElement!.textContent).toContain('IP address');
    expect(harness.routeNativeElement!.textContent).toContain('Waiting for a device');
  });

  it('shows the 404 status message for an unknown or expired room', async () => {
    await harness.navigateByUrl('/room/012345/waiting');
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345`)
      .flush({ message: 'unrelated wording' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Unknown or expired code');
    expect(harness.routeNativeElement!.querySelector('.waiting-title')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.waiting-lead')).toBeNull();
  });

  it('removes the invitation and sharing actions when the countdown reaches zero', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
    await harness.navigateByUrl('/room/012345/waiting');
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345`)
      .flush({ ...room(), expiresAt: '2026-11-02T12:00:01Z' });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('.session-code')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain('Unknown or expired code');
    expect(page.querySelector('.waiting-title')).toBeNull();
    expect(page.querySelector('.session-code, .copy-code, .copy-link, .lan-link')).toBeNull();
    expect(page.querySelector('.cancel-button')?.textContent).toBe('Back to home');
  });

  it('rejects a malformed waiting route without calling the API', async () => {
    await harness.navigateByUrl('/room/123/waiting');
    expect(harness.routeNativeElement!.textContent).toContain('Invalid room code');
    http.expectNone(() => true);
  });

  function room() {
    return { code: '012345', createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(), devices: [] };
  }
});
