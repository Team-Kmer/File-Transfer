import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Deprecated in Angular 20.2 but still required by Angular Material components.
    // See https://github.com/angular/components/issues (Material migration pending)
    provideAnimationsAsync()
  ]
};
