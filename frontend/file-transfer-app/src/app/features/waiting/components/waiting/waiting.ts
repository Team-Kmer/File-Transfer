import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { RoomSessionService } from '../../../../core/services/room-session.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { RoomWaitingService } from '../../services/room-waiting.service';
import { RoomInvite } from '../room-invite/room-invite';

@Component({
  selector: 'app-waiting',
  imports: [PageHeader, RoomInvite],
  templateUrl: './waiting.html',
  styleUrls: ['./waiting.scss', './waiting.tw.css'],
  providers: [RoomWaitingService],
})
export class Waiting {
  protected readonly roomWaitingService = inject(RoomWaitingService);
  private readonly activatedRouteService = inject(ActivatedRoute);
  private readonly routerService = inject(Router);
  private readonly roomSessionService = inject(RoomSessionService);

  private readonly code = toSignal(this.activatedRouteService.paramMap.pipe(
    map(parameters => parameters.get('code') ?? ''),
  ), { initialValue: '' });

  private readonly loadRoomEffect = effect(() => {
    const code = this.code();
    untracked(() => this.roomWaitingService.loadRoom(code));
  });

  protected resolveCancelSessionEvent(): void {
    this.roomSessionService.clearRoom();
    void this.routerService.navigate(['/']);
  }
}
