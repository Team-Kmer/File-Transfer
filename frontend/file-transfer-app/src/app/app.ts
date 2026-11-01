import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from './features/home/home';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './app.tw.css'],
  host: { '[class.home-layout]': 'isHomeView()' },
})
export class App {
  protected readonly isHomeView = signal(false);

  protected resolveActivateEvent(component: unknown): void {
    this.isHomeView.set(component instanceof Home);
  }
}
