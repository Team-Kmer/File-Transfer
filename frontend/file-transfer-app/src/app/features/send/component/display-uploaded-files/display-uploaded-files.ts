import {Component, inject, input} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {SendHandlerService} from '../../service/send-handler.service';

@Component({
  selector: 'app-display-uploaded-files',
  imports: [
    MatIcon
  ],
  templateUrl: './display-uploaded-files.html',
  styleUrls: ['./display-uploaded-files.scss', 'display-uploaded-files.tw.css'],
})
export class DisplayUploadedFiles {
  protected readonly sendHandlerService = inject(SendHandlerService);
  readonly uploadedFiles = input<File[]>([]);

  protected getFileType(file: File, fileName: string): string {
    return this.sendHandlerService.formatFileType(file.type, fileName);
  };

  protected getFileSize(file: File) {
    return this.sendHandlerService.formatFileSize(file.size);
  };
}
