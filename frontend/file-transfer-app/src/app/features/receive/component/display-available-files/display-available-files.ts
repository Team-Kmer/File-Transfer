import {Component, inject, input, output, ResourceRef} from '@angular/core';
import {FileMetadata} from '../../../../shared/models/file-metadata.model';
import {DatePipe} from '@angular/common';
import {MatIcon} from '@angular/material/icon';
import {SendHandlerService} from '../../../send/service/send-handler.service';

@Component({
  selector: 'app-display-available-files',
  imports: [
    DatePipe,
    MatIcon
  ],
  templateUrl: './display-available-files.html',
  styleUrls: ['./display-available-files.scss', './display-available-files.tw.css'],
})
export class DisplayAvailableFiles {
  protected readonly sendHandlerService = inject(SendHandlerService);

  readonly filesResource = input.required<ResourceRef<FileMetadata[]>>();
  readonly removeFile = output<FileMetadata>();
  readonly download = output<FileMetadata>();

  protected onDownload(file: FileMetadata): void {
    this.download.emit(file);
  }

  protected formatFileSize(sizeBytes: number) {
    return this.sendHandlerService.formatFileSize(sizeBytes);
  };

  protected onRemove(file: FileMetadata): void {
    this.removeFile.emit(file);
  }
}
