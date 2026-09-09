import {Component, inject, signal} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {FileMetadata} from '../../../../shared/models/file-metadata.model';
import {FileApiService} from '../../../../core/services/file-api.service';
import {AppError} from '../../../../core/errors/app-error.model';

@Component({
  selector: 'app-delete-file-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogClose,
    MatDialogActions,
    MatButton
  ],
  templateUrl: './delete-file-dialog.html',
  styleUrls:[ './delete-file-dialog.scss','delete-file-dialog.tw.css'],
})

export class DeleteFileDialog {
  protected readonly file = inject<FileMetadata>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<DeleteFileDialog, boolean>>(MatDialogRef);
  private readonly fileApiService = inject(FileApiService);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected confirmDelete(): void {
    this.deleting.set(true);
    this.errorMessage.set(null);

    this.fileApiService.deleteFile(this.file.id).subscribe({
      next: () => this.dialogRef.close(true),

      error: (error: AppError) => {
        this.deleting.set(false);
        this.errorMessage.set(
          error.message || 'Could not delete the file.',
        );
      },
    });
  }
}
