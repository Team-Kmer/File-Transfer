import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrls: ['./page-header.scss', './page-header.tw.css'],
  host: { role: 'banner', '(keydown.escape)': 'closeMenu()', '[class.with-status]': 'hasStatus()' },
})
export class PageHeader {
  public readonly status = input('');
  protected readonly isMenuOpen = signal(false);
  protected readonly hasStatus = computed(() => this.isStatusVisible());
  protected readonly desktopMenuIcon = computed(() => this.getDesktopMenuIcon());

  protected toggleMenu(): void {
    this.isMenuOpen.update(isMenuOpen => !isMenuOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  private isStatusVisible(): boolean {
    return this.status().length > 0;
  }

  private getDesktopMenuIcon(): string {
    return this.hasStatus() ? '/icons/session-home.svg#menu' : '/icons/session-home.svg#help';
  }
}
