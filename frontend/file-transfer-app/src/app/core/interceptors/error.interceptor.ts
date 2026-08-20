import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError } from '../errors/app-error.model';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((raw: HttpErrorResponse) => {
      const normalized: AppError = toAppError(raw);
      return throwError(() => normalized);
    }),
  );
};

function toAppError(raw: HttpErrorResponse): AppError {
  if (raw.status === 0) {
    return {
      kind: 'network',
      message: 'The server is unreachable. Check to see if the backend is running.',
      status: 0,
    };
  }
  if (raw.status >= 500) {
    return {
      kind: 'server',
      message: 'An error occurred while trying to reach the server.',
      status: raw.status,
    };
  }
  if (raw.status >= 400) {
    return {
      kind: 'client',
      message: 'Invalid request',
      status: raw.status,
    };
  }
  return {
    kind: 'unknown',
    message: 'An unexpected error has occurred.',
    status: raw.status,
  };
}
