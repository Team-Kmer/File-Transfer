import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HomeIntro } from './components/home-intro/home-intro';
import { HowItWorks } from './components/how-it-works/how-it-works';
import { RoomSessionService } from '../../core/rooms/room-session.service';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-home',
  imports: [PageHeader, HomeIntro, HowItWorks],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home.tw.css'],
})
export class Home {
  protected readonly roomSessionService = inject(RoomSessionService);
  private readonly routerService = inject(Router);
  private readonly destroyRefService = inject(DestroyRef);

  protected resolveJoinRoomEvent(code: string): void {
    void this.routerService.navigate(['/room', code]);
  }

  protected resolveCreateRoomEvent(): void {
    this.roomSessionService
      .createRoom()
      .pipe(takeUntilDestroyed(this.destroyRefService))
      .subscribe((room) => void this.routerService.navigate(['/room', room.code, 'waiting']));
  }
}
