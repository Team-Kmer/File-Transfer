import { Component, input, output } from '@angular/core';
import { Room } from '../../../../core/rooms/room.model';
import { RoomDevice } from '../../interfaces/room-device';
import { RoomDevices } from '../room-devices/room-devices';

@Component({
  selector: 'app-room-shell',
  imports: [RoomDevices],
  templateUrl: './room-shell.html',
  styleUrls: ['./room-shell.scss', './room-shell.tw.css'],
})
export class RoomShell {
  public readonly room = input.required<Room>();
  public readonly countdown = input.required<string>();
  public readonly devices = input.required<RoomDevice[]>();
  public readonly refreshEvent = output<void>();
  public readonly backEvent = output<void>();

  protected onRefreshEvent(): void { this.refreshEvent.emit(); }
  protected fireBackEvent(): void { this.backEvent.emit(); }
}
