import { inject, Injectable } from '@angular/core';
import { concatMap, from, map, Observable, retry, RetryConfig, throwError, timer } from 'rxjs';
import { chunkRange } from '../../../core/classes/uploads/chunk-math';
import { isRetryable, retryDelayMs } from '../../../core/classes/uploads/retry-policy';
import { isTerminalCheckpoint } from '../../../core/classes/uploads/upload-checkpoint-state';
import { AppError } from '../../../core/errors/app-error.model';
import { ChunkReceipt } from '../../../core/interfaces/uploads/chunk-receipt';
import { UploadCheckpoint } from '../../../core/interfaces/uploads/upload-checkpoint';
import { UploadPlan } from '../../../core/interfaces/uploads/upload-plan';
import { ChunkedUploadApiService } from '../../../core/services/chunked-upload-api.service';

// Talks to the server for one upload. It keeps no state and never touches what the screen shows.
@Injectable({ providedIn: 'root' })
export class ChunkTransferService {
  private readonly chunkedUploadApiService = inject(ChunkedUploadApiService);

  private readonly maxRetries = 3;
  private readonly stillProcessingError: AppError = {
    kind: 'server', message: 'The server is still finishing the file. Try again in a moment.',
  };

  public sendChunks(file: File, plan: UploadPlan, indexes: number[]): Observable<ChunkReceipt> {
    return from(indexes).pipe(concatMap(index => this.sendOne(file, plan, index)));
  }

  public confirmTerminal(uploadId: string): Observable<UploadCheckpoint> {
    return this.chunkedUploadApiService.getStatus(uploadId).pipe(
      map(checkpoint => this.requireTerminal(checkpoint)),
      retry(this.retryConfig(error => this.isStillProcessing(error) || isRetryable(error.status))),
    );
  }

  public isStillProcessing(error: AppError): boolean {
    return error === this.stillProcessingError;
  }

  private sendOne(file: File, plan: UploadPlan, index: number): Observable<ChunkReceipt> {
    const { start, end } = chunkRange(index, plan.chunkSize, file.size);
    return this.chunkedUploadApiService.sendChunk(plan.uploadId, index, file.slice(start, end)).pipe(
      retry(this.retryConfig(error => isRetryable(error.status))),
      map(acknowledgement => ({ index, acknowledgement })),
    );
  }

  private requireTerminal(checkpoint: UploadCheckpoint): UploadCheckpoint {
    if (isTerminalCheckpoint(checkpoint)) {
      return checkpoint;
    }
    throw this.stillProcessingError;
  }

  private retryConfig(canRetry: (error: AppError) => boolean): RetryConfig {
    return {
      count: this.maxRetries,
      delay: (error: AppError, attempt: number) => canRetry(error)
        ? timer(retryDelayMs(attempt)) : throwError(() => error),
    };
  }
}
