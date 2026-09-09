import {Component, computed, inject} from '@angular/core';
import {ReceiveHandlerService} from './service/receive-handler-service';
import {FileMetadata} from '../../shared/models/file-metadata.model';
import {MatButton} from '@angular/material/button';
import {AppError} from '../../core/errors/app-error.model';
import {SendHandlerService} from '../send/service/send-handler.service';
import {DisplayAvailableFiles} from './component/display-available-files/display-available-files';
import {MatIcon} from '@angular/material/icon';

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

  protected readonly errorMessage = computed(() => {
    const error = this.filesResource().error();
    const appError = ((error as Error | undefined)?.cause ?? error) as AppError | undefined;
    return appError?.message ?? 'Unable to load the file list';
  });

  protected readonly filesResource = computed(() => this.receiveHandlerService.fileResource);

  protected refresh(): void {
    this.filesResource().reload();
  };

  protected onDownload(file: FileMetadata): void {
    this.receiveHandlerService.resolveDownLoad(file);
  };

}
