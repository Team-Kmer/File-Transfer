import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChunkReceivedResponse } from '../interfaces/uploads/chunk-received-response';
import { InitUploadRequest } from '../interfaces/uploads/init-upload-request';
import { InitUploadResponse } from '../interfaces/uploads/init-upload-response';

import { ChunkAcknowledgement } from '../interfaces/uploads/chunk-acknowledgement';
import { UploadPlan } from '../interfaces/uploads/upload-plan';
import { UploadCheckpoint } from '../interfaces/uploads/upload-checkpoint';
import { UploadStatusResponse } from '../interfaces/uploads/upload-status-response';
import { ChunkedUploadMappingService } from './chunked-upload-mapping.service';

@Injectable({ providedIn: 'root' })
export class ChunkedUploadApiService {
  private readonly httpClientService = inject(HttpClient);
  private readonly chunkedUploadMappingService = inject(ChunkedUploadMappingService);
  private readonly baseUrl = `${environment.apiBaseUrl}/files/upload`;

  public init(request: InitUploadRequest): Observable<UploadPlan> {
    return this.httpClientService.post<InitUploadResponse>(`${this.baseUrl}/init`, request).pipe(
      map(response => this.chunkedUploadMappingService.toUploadPlan(response)),
    );
  }

  public sendChunk(uploadId: string, index: number, blob: Blob): Observable<ChunkAcknowledgement> {
    return this.httpClientService.put<ChunkReceivedResponse>(
      `${this.baseUrl}/${uploadId}/chunks/${index}`, blob,
      { headers: { 'Content-Type': 'application/octet-stream' } },
    ).pipe(map(response => this.chunkedUploadMappingService.toAcknowledgement(response)));
  }

  public getStatus(uploadId: string): Observable<UploadCheckpoint> {
    return this.httpClientService.get<UploadStatusResponse>(`${this.baseUrl}/${uploadId}`).pipe(
      map(response => this.chunkedUploadMappingService.toCheckpoint(response)),
    );
  }

  public abort(uploadId: string): Observable<void> {
    return this.httpClientService.delete<void>(`${this.baseUrl}/${uploadId}`);
  }
}
