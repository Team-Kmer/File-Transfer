import {AppError} from '../../../core/errors/app-error.model';
import {FILE_TYPE_BY_MIME, FileTypeLabel} from '../enums/fileTypeLabel';
import {Injectable} from '@angular/core';

@Injectable()
export class SendHandlerService {

  public humanize(err: AppError): string {
    switch (err.kind) {
      case 'network':
        return 'Unable to reach the server';
      case 'client':
        return err.message || 'Invalid file';
      case 'server':
        return 'Server error, please try again.';
      default:
        return 'Unknown error';
    }
  }

  public formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} Ko`;
    }

    return `${(sizeBytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  public formatFileType(mimeType: string, fileName: string): string {
    const knownType = FILE_TYPE_BY_MIME[mimeType];

    if (knownType) {
      return knownType;
    }

    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('audio/')) return 'Audio file';
    if (mimeType.startsWith('video/')) return 'Video file';
    if (mimeType.startsWith('text/')) {
      return FileTypeLabel.TextDocument;
    }

    const extension = fileName.split('.').pop()?.toUpperCase();

    return extension && extension !== fileName.toUpperCase() ? `${extension} file` : 'File';
  }

  public getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');

    if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
      return 'FILE';
    }

    return fileName.slice(lastDotIndex + 1).toUpperCase().slice(0, 5);
  }

}
