import {Routes} from '@angular/router';
import {Home} from './features/home/home';
import {Send} from './features/send/send';
import {Receive} from './features/receive/receive';

export const routes: Routes = [
  {path: '', component: Home},
  {path: 'send', component: Send},
  {path: 'receive', component: Receive},
  {path: '**', redirectTo: ''}
];
