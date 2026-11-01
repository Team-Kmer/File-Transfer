import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HomeIntro } from './components/home-intro/home-intro';
import { HowItWorks } from './components/how-it-works/how-it-works';

@Component({
  selector: 'app-home',
  imports: [RouterLink, HomeIntro, HowItWorks],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home.tw.css'],
})
export class Home {
  private readonly routerService = inject(Router);
  protected readonly isMenuOpen = signal(false);

  protected toggleMenu(): void {
    this.isMenuOpen.update(isMenuOpen => !isMenuOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected resolveJoinRoomEvent(code: string): void {
    void this.routerService.navigate(['/room', code]);
  }
}
