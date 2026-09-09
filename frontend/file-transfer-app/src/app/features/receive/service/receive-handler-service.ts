import {inject, Injectable} from '@angular/core';
import {FileApiService} from '../../../core/services/file-api.service';
import {rxResource} from '@angular/core/rxjs-interop';
import {FileMetadata} from '../../../shared/models/file-metadata.model';
import {AppError} from '../../../core/errors/app-error.model';
import {Observable} from 'rxjs';

@Injectable()
export class ReceiveHandlerService {
  public readonly fileApiService = inject(FileApiService);

  public readonly fileResource = rxResource({
    stream: () => this.fileApiService.getAllFiles(),
    defaultValue: [] as FileMetadata[]
  });

  public resolveDownLoad(file: FileMetadata): void {
    this.fileApiService.downloadFile(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err : AppError) => {
        console.error(err);
      },
    });
  };

  public deleteFile(id: string): Observable<void> {
    return this.fileApiService.deleteFile(id);
  }

}

