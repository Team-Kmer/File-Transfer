import { Routes } from '@angular/router';
import { Waiting } from './components/waiting/waiting';

export const waitingRoutes: Routes = [
  { path: '', component: Waiting, data: { layout: 'wide' } },
];
