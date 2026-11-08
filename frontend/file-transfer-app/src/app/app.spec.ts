import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { Home } from './features/home/home';
import { Send } from './features/send/send';
import { environment } from '../environments/environment';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: Home, data: { layout: 'wide' } },
          { path: 'send', component: Send },
          { path: 'wide-send', component: Send, data: { layout: 'wide' } },
          { path: 'compact-home', component: Home },
          { path: 'room/:code/waiting', loadChildren: () => import('./features/waiting/waiting.routes').then(module => module.waitingRoutes) },
        ]),
        provideHttpClient(), provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  it('expands the home layout and restores the constrained layout for Phase 1', async () => {
    const router = TestBed.inject(Router);
    const page = fixture.nativeElement as HTMLElement;
    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(page.querySelector('app-home')).not.toBeNull();
    expect(page.classList.contains('home-layout')).toBe(true);
    await router.navigateByUrl('/send');
    await fixture.whenStable();
    expect(page.querySelector('app-send')).not.toBeNull();
    expect(page.classList.contains('home-layout')).toBe(false);
  });

  it.each([['/wide-send', true], ['/compact-home', false]])(
    'uses route data for %s rather than the component type', async (url, isWide) => {
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
      expect(fixture.nativeElement.classList.contains('home-layout')).toBe(isWide);
    },
  );

  it('uses the layout declared on the waiting child route without parent data', async () => {
    await TestBed.inject(Router).navigateByUrl('/room/012345/waiting');
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/rooms/012345`)
      .flush({ code: '012345', createdAt: '', expiresAt: new Date(Date.now() + 60000).toISOString(), devices: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-waiting')).not.toBeNull();
    expect(fixture.nativeElement.classList.contains('home-layout')).toBe(true);
  });
});
