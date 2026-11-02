import { Routes } from '@angular/router';
import { RoomPage } from './components/room-page/room-page';

export const roomRoutes: Routes = [
  { path: '', component: RoomPage, data: { layout: 'wide' } },
];
