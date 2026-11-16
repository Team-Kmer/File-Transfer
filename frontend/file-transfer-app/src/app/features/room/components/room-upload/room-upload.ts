import { Component, computed, inject, signal } from '@angular/core';
import { ChunkedUploadService } from '../../services/chunked-upload.service';
import { UploadPresentationService } from '../../services/upload-presentation.service';
import { UploadProgress } from '../upload-progress/upload-progress';

@Component({
  selector: 'app-room-upload',
  imports: [UploadProgress],
  templateUrl: './room-upload.html',
  styleUrls: ['./room-upload.scss', './room-upload.tw.css'],
  providers: [ChunkedUploadService, UploadPresentationService],
  host: {
    '(dragenter)': 'enterDropZone($event)',
    '(dragover)': 'markDragOver($event)',
    '(dragleave)': 'clearDragOver($event)',
    '(drop)': 'dropFile($event)',
    '[class.is-dragging]': 'isDragging()',
  },
})
export class RoomUpload {
  private readonly chunkedUploadService = inject(ChunkedUploadService);
  private readonly uploadPresentationService = inject(UploadPresentationService);

  protected readonly isDragging = signal(false);

  protected readonly display = computed(() => this.uploadPresentationService.present(this.chunkedUploadService.state()));

  private dragDepth = 0;

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (this.hasSelectedFile(file)) {
      this.chunkedUploadService.start(file);
    }
    input.value = '';
  }

  protected enterDropZone(event: DragEvent): void {
    this.dragDepth += 1;
    this.markDragOver(event);
  }

  protected markDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(!this.display().isBusy);
  }

  protected clearDragOver(event: DragEvent): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.isMovingWithinZone(event) || this.hasNestedDrag()) {
      return;
    }
    this.isDragging.set(false);
  }

  protected dropFile(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (this.hasSelectedFile(file)) {
      this.chunkedUploadService.start(file);
    }
  }

  protected resumeUpload(): void {
    this.chunkedUploadService.resume();
  }

  protected cancelUpload(): void {
    this.chunkedUploadService.cancel();
  }

  private hasNestedDrag(): boolean {
    return this.dragDepth > 0;
  }

  private isMovingWithinZone(event: DragEvent): boolean {
    const host = event.currentTarget as HTMLElement;
    return event.relatedTarget instanceof Node && host.contains(event.relatedTarget);
  }

  private hasSelectedFile(file: File | undefined): file is File {
    return file !== undefined;
  }
}
