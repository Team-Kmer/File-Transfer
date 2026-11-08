import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DeviceRequest } from '../rooms/room.model';

export const devRoomsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isPostRequest(request)) {
    return next(request);
  }
  if (isDemoRequest(request, '000202')) {
    const { deviceId } = request.body as DeviceRequest;
    return of(new HttpResponse({
      status: 202, statusText: 'Accepted', body: { code: '000202', deviceId, status: 'PENDING' },
    }));
  }
  if (isDemoRequest(request, '000409')) {
    return throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' }));
  }
  return next(request);
};

function isPostRequest(request: HttpRequest<unknown>): boolean {
  return request.method === 'POST';
}

function isDemoRequest(request: HttpRequest<unknown>, code: string): boolean {
  return request.url === `${environment.apiBaseUrl}/rooms/${code}/join`;
}
