import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {FileMetadata} from '../../shared/models/file-metadata.model';
import {catchError, Observable, throwError} from 'rxjs';
import {AppError} from '../errors/app-error.model';

@Injectable({providedIn: 'root'})
export class FileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/files`;

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileMetadata>(this.baseUrl, formData)
      .pipe(this.logAndThrowError('upload'))
  }

  getAllFiles(): Observable<FileMetadata[]> {
    return this.http.get<FileMetadata[]>(`${this.baseUrl}`)
      .pipe(this.logAndThrowError('getAllFiles'));
  }

  downloadFile(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}`, {responseType: 'blob'})
      .pipe(this.logAndThrowError(`downloadFile(${id})`));
  }

  deleteFile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`)
      .pipe(this.logAndThrowError(`deleteFile(${id})`));
  }

  private logAndThrowError<T>(requestName: string) {
    return catchError<T, Observable<never>>((error: AppError) => {
      console.error(`[FileApiService] ${requestName} failed:`, error);
      return throwError(() => error);
    })
  }
}
