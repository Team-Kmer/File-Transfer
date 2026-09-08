import {Component, DestroyRef, effect, ElementRef, inject, input,
          model, output, signal, viewChild} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {DecimalPipe} from '@angular/common';
import {PreviewKind} from '../../service/types';
import {SendHandlerService} from '../../service/send-handler.service';

@Component({
  selector: 'app-upload',
  imports: [
    MatIcon,
    DecimalPipe
  ],
  templateUrl: './upload.html',
  styleUrls: ['./upload.scss', 'upload.tw.css'],
})
export class Upload {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly sendHandlerService = inject(SendHandlerService);

  private objectUrl: string | null = null;

  protected readonly previewKind = signal<PreviewKind>('none');
  protected readonly previewUrl = signal<string>('');


  public readonly disabled = input(false);
  public readonly file = model<File | null>(null);
  private readonly fileInputElement = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  public readonly validationError = output<string | null>();

  constructor() {
    effect(() => {
      if (this.file() !== null) {
        return;
      }

      const inputElement = this.fileInputElement();

      if (inputElement) {
        inputElement.nativeElement.value = '';
      }

      this.clearPreview();
    });

    this.destroyRef.onDestroy(() => this.clearPreview());
  }

  protected onFileSelected(event: Event): void {
    if (this.disabled()) {
      return;
    }

    const inputElement = event.target as HTMLInputElement;
    const selectedFile = inputElement.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > this.MAX_FILE_SIZE) {
      this.file.set(null);
      inputElement.value = '';

      this.validationError.emit(
        'File size exceeded (max 10 MB)'
      );

      return;
    }

    this.validationError.emit(null);
    this.preparePreview(selectedFile);
    this.file.set(selectedFile);
  };

  protected clearFile(event: MouseEvent): void {
    event.stopPropagation();
    this.resetInput();
  };

  private resetInput(): void {
    this.fileInputElement().nativeElement.value = '';
    this.file.set(null);
    this.clearPreview();
  }

  private clearPreview(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.previewUrl.set('');
    this.previewKind.set('none');
  }

  private preparePreview(file: File): void {
    this.clearPreview();

    if (file.type.startsWith('image/')) {
      this.objectUrl = URL.createObjectURL(file);
      this.previewUrl.set(this.objectUrl);
      this.previewKind.set('image');
      return;
    }

    if (file.type === 'application/pdf') {
      this.previewKind.set('pdf');
      return;
    }

    this.previewKind.set('none');
  }

}
