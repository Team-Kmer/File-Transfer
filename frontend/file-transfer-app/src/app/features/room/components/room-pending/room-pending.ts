import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-room-pending',
  templateUrl: './room-pending.html',
  styleUrls: ['./room-pending.scss', './room-pending.tw.css'],
})
export class RoomPending {
  public readonly code = input.required<string>();
  public readonly deviceName = input.required<string>();
  public readonly backEvent = output<void>();

  protected fireBackEvent(): void { this.backEvent.emit(); }
}
