import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { ClipboardService } from '../../../../core/services/clipboard.service';
import { invitationUrl, isLoopbackHostname, sessionCodeLabel } from './invitation';

@Component({
  selector: 'app-room-invite',
  templateUrl: './room-invite.html',
  styleUrls: ['./room-invite.scss', './room-invite.tw.css'],
})
export class RoomInvite {
  private readonly clipboardService = inject(ClipboardService);
  private readonly destroyRefService = inject(DestroyRef);

  public readonly code = input.required<string>();
  public readonly countdown = input.required<string>();
  public readonly status = input.required<string>();
  public readonly cancelSessionEvent = output<void>();
  public readonly openRoomEvent = output<void>();

  protected readonly copyFeedback = signal('');
  protected readonly displayCode = computed(() => this.getDisplayCode());
  protected readonly joinUrl = computed(() => this.getJoinUrl());
  protected readonly isLocalhost = isLoopbackHostname(location.hostname);

  protected copyCode(field: HTMLInputElement): void {
    void this.copy(this.code(), field, 'Code copied');
  }

  protected copyLink(field: HTMLInputElement): void {
    void this.copy(this.joinUrl(), field, 'Link copied');
  }

  protected fireCancelSessionEvent(): void {
    this.cancelSessionEvent.emit();
  }

  protected fireOpenRoomEvent(): void {
    this.openRoomEvent.emit();
  }

  private getDisplayCode(): string {
    return sessionCodeLabel(this.code());
  }

  private getJoinUrl(): string {
    return invitationUrl(location.origin, this.code());
  }

  private async copy(value: string, field: HTMLInputElement, successMessage: string): Promise<void> {
    const isCopied = await this.clipboardService.copy(value);
    if (this.destroyRefService.destroyed) {
      return;
    }
    if (!isCopied) {
      field.focus();
      field.select();
    }
    this.copyFeedback.set(isCopied ? successMessage : 'Clipboard unavailable. Text selected; copy it manually.');
  }
}
