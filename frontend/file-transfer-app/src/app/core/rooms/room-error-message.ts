import { AppError } from '../errors/app-error.model';

export function roomErrorMessage(error: AppError): string {
  switch (error.status) {
    case 404: return 'Unknown or expired code';
    case 409: return 'Session full';
    case 400: return 'Invalid room code';
    case 0: return 'Network error';
    default:
      if (error.status !== undefined && error.status >= 500) {
        return 'Server error, please try again';
      }
      return 'Something went wrong. Please try again later.';
  }
}
