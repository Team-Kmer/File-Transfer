import { Component, computed, output, signal } from '@angular/core';
import { isValidRoomCode } from '../../../../core/rooms/room-code.validator';
import { codeDigits, normalizeRoomCode } from './code-digits';

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
  protected readonly activeCodeIndex = signal<number | null>(null);

  protected readonly hasCodeError = computed(() => this.isRoomCodeInvalid());
  protected readonly roomCodeFeedback = computed(() => this.getRoomCodeFeedback());
  protected readonly codeDigits = computed(() => this.getCodeDigits());

  protected updateRoomCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setRoomCode(input, input.value);
  }

  protected pasteRoomCode(event: ClipboardEvent): void {
    if (event.clipboardData === null) {
      return;
    }
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const text = event.clipboardData.getData('text');
    this.setRoomCode(input, input.value.slice(0, start) + text + input.value.slice(end), start + text.length);
  }

  protected updateCodeFocus(event: Event): void {
    this.syncCodeFocus(event.target as HTMLInputElement);
  }

  protected clearCodeFocus(): void {
    this.activeCodeIndex.set(null);
  }

  protected isCodeSlotActive(index: number): boolean {
    return this.activeCodeIndex() === index;
  }

  protected focusCodeSlot(event: PointerEvent, index: number, input: HTMLInputElement): void {
    event.preventDefault();
    const start = Math.min(index, input.value.length);
    input.focus();
    input.setSelectionRange(start, Math.min(start + 1, input.value.length));
    this.syncCodeFocus(input);
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

  private getCodeDigits(): string[] {
    return codeDigits(this.roomCode());
  }

  private setRoomCode(input: HTMLInputElement, value: string, position = input.selectionStart ?? value.length): void {
    const code = normalizeRoomCode(value);
    const caret = normalizeRoomCode(value.slice(0, position)).length;
    input.value = code;
    input.setSelectionRange(caret, caret);
    this.roomCode.set(code);
    this.syncCodeFocus(input);
  }

  private syncCodeFocus(input: HTMLInputElement): void {
    if (document.activeElement !== input) {
      return;
    }
    this.activeCodeIndex.set(Math.min(input.selectionStart ?? 0, 5));
  }
}
