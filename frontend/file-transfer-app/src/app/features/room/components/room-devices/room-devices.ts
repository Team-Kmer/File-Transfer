import { Component, input, output } from '@angular/core';
import { Room } from '../../../../core/rooms/room.model';
import { RoomDevice } from '../../interfaces/room-device';

@Component({
  selector: 'app-room-devices',
  templateUrl: './room-devices.html',
  styleUrls: ['./room-devices.scss', './room-devices.tw.css'],
})
export class RoomDevices {
  public readonly room = input.required<Room>();
  public readonly devices = input.required<RoomDevice[]>();
  public readonly refreshEvent = output<void>();

  protected fireRefreshEvent(): void { this.refreshEvent.emit(); }

}
