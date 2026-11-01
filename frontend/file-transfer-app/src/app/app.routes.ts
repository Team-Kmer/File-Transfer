import {Routes} from '@angular/router';
import {Home} from './features/home/home';
import {Send} from './features/send/send';
import {Receive} from './features/receive/receive';

export const routes: Routes = [
  {path: '', component: Home, data: { layout: 'wide' }},
  {
    path: 'room/:code/waiting', data: { layout: 'wide' },
    loadChildren: () => import('./features/waiting/waiting.routes').then(module => module.waitingRoutes),
  },
  {path: 'send', component: Send},
  {path: 'receive', component: Receive},
  {path: '**', redirectTo: ''}
];
