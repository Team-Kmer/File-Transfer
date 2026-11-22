import { AppError } from '../../errors/app-error.model';

export function uploadErrorMessage(error: AppError): string {
  switch (error.status) {
    case 413: return 'File too large (max 2 GB)';
    case 415: return 'Blocked file type';
    case 404: return 'Upload or session expired';
    case 409: return 'Upload already completed or cancelled';
    case 0: return 'Network error. Check your connection.';
    default: return (error.status ?? 0) >= 500
      ? 'Server error. Please try again later.' : 'Unable to upload this file.';
  }
}
