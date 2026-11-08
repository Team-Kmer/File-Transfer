import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './app.tw.css'],
  host: { '[class.home-layout]': 'isWideLayout()' },
})
export class App {
  protected readonly isWideLayout = signal(false);

  protected resolveActivateEvent(outlet: RouterOutlet): void {
    this.isWideLayout.set(outlet.activatedRouteData['layout'] === 'wide');
  }
}
