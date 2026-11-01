import { Component, computed, output, signal } from '@angular/core';
import { isValidRoomCode } from '../../../../core/rooms/room-code.validator';

@Component({
  selector: 'app-home-intro',
  templateUrl: './home-intro.html',
  styleUrls: ['./home-intro.scss', './home-intro.tw.css'],
  host: { role: 'region', 'aria-labelledby': 'home-title' },
})
export class HomeIntro {
  public readonly joinRoomEvent = output<string>();

  protected readonly roomCode = signal('');
  protected readonly hasSubmitted = signal(false);

  protected readonly hasCodeError = computed(() => this.isRoomCodeInvalid());
  protected readonly roomCodeFeedback = computed(() => this.getRoomCodeFeedback());

  protected updateRoomCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.roomCode.set(input.value);
  }

  protected fireJoinRoomEvent(event: Event): void {
    event.preventDefault();
    this.hasSubmitted.set(true);
    if (this.hasCodeError()) {
      return;
    }
    this.joinRoomEvent.emit(this.roomCode());
  }

  private isRoomCodeInvalid(): boolean {
    return this.hasSubmitted() && !isValidRoomCode(this.roomCode());
  }

  private getRoomCodeFeedback(): string {
    if (this.hasCodeError()) {
      return 'Enter exactly 6 digits.';
    }
    return 'Enter the 6-digit code shown on the other device.';
  }
}
