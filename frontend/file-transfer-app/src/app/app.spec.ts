import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { Home } from './features/home/home';
import { Send } from './features/send/send';

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: '', component: Home }, { path: 'send', component: Send }]),
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
});
