import {Component, computed, inject} from '@angular/core';
import {ReceiveHandlerService} from './service/receive-handler-service';
import {FileMetadata} from '../../shared/models/file-metadata.model';
import {MatButton} from '@angular/material/button';
import {AppError} from '../../core/errors/app-error.model';
import {SendHandlerService} from '../send/service/send-handler.service';
import {DisplayAvailableFiles} from './component/display-available-files/display-available-files';
import {MatIcon} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {DeleteFileDialog} from './component/delete-file-dialog/delete-file-dialog';

@Component({
  selector: 'app-receive',
  imports: [
    MatButton,
    DisplayAvailableFiles,
    MatIcon
  ],
  templateUrl: './receive.html',
  styleUrls: ['./receive.scss', './receive.tw.css'],
  providers: [ReceiveHandlerService, SendHandlerService]
})
export class Receive {
  protected readonly receiveHandlerService = inject(ReceiveHandlerService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly errorMessage = computed(() => {
    const error = this.filesResource().error();

    if (!error) {return null;}

    const appError = ((error as Error).cause ?? error) as AppError;

    return appError.message || 'Unable to load the file list';
  });

  protected readonly filesResource = computed(() => this.receiveHandlerService.fileResource);

  protected refresh(): void {
    this.filesResource().reload();
  };

  protected onDownload(file: FileMetadata): void {
    this.receiveHandlerService.resolveDownLoad(file);
  };

  protected onDelete(file: FileMetadata): void {
    this.dialog.open(DeleteFileDialog, {
        data: file,
        width: '420px',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((deleted: boolean) => {
        if (!deleted) return;

        this.filesResource().reload();
        this.snackBar.open(`"${file.name}" deleted`, 'Close', {
          duration: 3000,
        });
      });
  }
}
