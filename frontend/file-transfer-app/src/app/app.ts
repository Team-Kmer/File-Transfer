import { Component, inject, signal } from '@angular/core';
import { HealthResponse } from './core/services/health.model';
import { AppError } from './core/errors/app-error.model';
import { HealthService } from './core/services/health-service';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-root',
  imports: [MatButton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly healthService = inject(HealthService);

  readonly status = signal<HealthResponse | null>(null);
  readonly error = signal<AppError | null>(null);
  readonly loading = signal<boolean>(false);

  checkHealth() {
    this.loading.set(true);
    this.status.set(null);
    this.error.set(null);

    this.healthService.getHealth().subscribe({
      next: (res) => {
        this.status.set(res);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
