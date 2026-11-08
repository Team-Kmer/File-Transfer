import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import { routes } from '../../../../app.routes';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';

describe('Room navigation using application routes', () => {
  it('opens the room from the host invitation and joins through the public route', async () => {
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
    ] });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/room/012345/waiting');
    const room = { code: '012345', createdAt: '', expiresAt: new Date(Date.now() + 60000).toISOString(), devices: [] };
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345`).flush(room);
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.open-room')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/room/012345');
    http.expectOne(`${environment.apiBaseUrl}/rooms/012345/join`).flush(room);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('app-room-shell')).not.toBeNull();
    http.verify();
  });
});
