import {Component, computed, inject, signal} from '@angular/core';
import {UploadState} from './service/types';
import {AppError} from '../../core/errors/app-error.model';
import {CurrentState} from './enums/currentState';
import {FileApiService} from '../../core/services/file-api.service';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {SendHandlerService} from './service/send-handler.service';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {Upload} from './component/upload/upload';
import {UploadedFileStore} from './stores/uploadedFileStore';
import {DisplayUploadedFiles} from './component/display-uploaded-files/display-uploaded-files';

@Component({
  selector: 'app-send',
  imports: [
    MatIcon,
    MatButton,
    MatProgressSpinner,
    Upload,
    DisplayUploadedFiles
  ],
  templateUrl: './send.html',
  styleUrls: ['./send.scss', './send.tw.css'],
  providers: [UploadedFileStore, SendHandlerService]
})

export class Send {
  private readonly fileApi = inject(FileApiService);
  private readonly sendHandlerService = inject(SendHandlerService);
  private readonly uploadedFileStore = inject(UploadedFileStore);

  protected selectedFile = signal<File | null>(null);
  protected state = signal<UploadState>({status: 'idle'});
  protected readonly CurrentState = CurrentState;

  protected readonly uploadedFiles = computed(() => this.uploadedFileStore.uploadedFiles())

  protected readonly canSend = computed(() =>
    this.selectedFile() !== null && this.state().status !== 'uploading'
  );

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === CurrentState.error ? state.message : null;
  });

  protected onSend() {
    const file = this.selectedFile();
    if (!file) return;
    this.state.set({status: 'uploading'});

    this.fileApi.uploadFile(file).subscribe({
      next: metadata => {
        this.state.set({status: 'success', filename: metadata.name});
        this.resetInput();
        this.uploadedFileStore.addUploadedFile(file);
      },
      error: (err: AppError) => {
        this.state.set({status: 'error', message: this.sendHandlerService.humanize(err)});
        this.resetInput();
      },
    });

  };

  protected onValidationError(message: string | null): void {
    if (this.state().status === CurrentState.uploading) {
      return;
    }

    if (message) {
      this.state.set({status: 'error', message});
      return;
    }

    this.state.set({status: 'idle'});
  }

  private resetInput(): void {
    this.selectedFile.set(null);
  };

}
