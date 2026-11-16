import { Component, input, output } from '@angular/core';
import { Room } from '../../../../core/rooms/room.model';
import { RoomDevice } from '../../interfaces/room-device';
import { RoomUpload } from '../room-upload/room-upload';
import { RoomDevices } from '../room-devices/room-devices';

@Component({
  selector: 'app-room-shell',
  host: {
    '(window:dragover)': 'preventFileNavigation($event)',
    '(window:drop)': 'preventFileNavigation($event)',
  },
  imports: [RoomDevices, RoomUpload],
  templateUrl: './room-shell.html',
  styleUrls: ['./room-shell.scss', './room-shell.tw.css'],
})
export class RoomShell {
  public readonly room = input.required<Room>();
  public readonly countdown = input.required<string>();
  public readonly devices = input.required<RoomDevice[]>();
  public readonly refreshEvent = output<void>();
  public readonly backEvent = output<void>();

  protected preventFileNavigation(event: DragEvent): void {
    if (this.hasFilePayload(event)) {
      event.preventDefault();
    }
  }

  protected onRefreshEvent(): void { this.refreshEvent.emit(); }
  protected fireBackEvent(): void { this.backEvent.emit(); }
  private hasFilePayload(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') === true;
  }
}
