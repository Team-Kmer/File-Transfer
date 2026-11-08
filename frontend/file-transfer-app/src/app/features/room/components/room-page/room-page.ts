import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { RoomClock } from '../../../../shared/services/room-clock.service';
import { RoomViewService } from '../../services/room-view.service';
import { RoomPending } from '../room-pending/room-pending';
import { RoomShell } from '../room-shell/room-shell';

@Component({
  selector: 'app-room',
  imports: [PageHeader, RoomPending, RoomShell],
  templateUrl: './room-page.html',
  styleUrls: ['./room-page.scss', './room-page.tw.css'],
  providers: [RoomClock, RoomViewService],
})
export class RoomPage {
  protected readonly roomViewService = inject(RoomViewService);
  private readonly activatedRouteService = inject(ActivatedRoute);
  private readonly routerService = inject(Router);

  private readonly code = toSignal(
    this.activatedRouteService.paramMap.pipe(map((parameters) => parameters.get('code') ?? '')),
    { initialValue: '' },
  );

  private readonly joinRoomEffect = effect(() => {
    const code = this.code();
    untracked(() => this.roomViewService.joinRoom(code));
  });

  protected resolveBackEvent(): void {
    this.roomViewService.clearRoom();
    void this.routerService.navigate(['/']);
  }

  protected resolveRefreshEvent(): void {
    this.roomViewService.refreshRoom();
  }
}
