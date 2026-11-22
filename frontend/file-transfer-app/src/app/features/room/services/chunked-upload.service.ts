import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { EMPTY, finalize, interval, Observable, Subscription, switchMap, tap } from 'rxjs';
import { isRetryable } from '../../../core/classes/uploads/retry-policy';
import { isTerminalCheckpoint } from '../../../core/classes/uploads/upload-checkpoint-state';
import { isAlreadyTerminal, transferErrorAction } from '../../../core/classes/uploads/upload-error-policy';
import { uploadErrorMessage } from '../../../core/classes/uploads/upload-error-message';
import { UploadProgressTracker } from '../../../core/classes/uploads/upload-progress-tracker';
import {
  cancelledState, cancellingState, cleanedUpState, cleaningUpState, cleanupFailedState, completedState, errorState,
  idleState, pausedState, resumedState, uploadingState, withProgress,
} from '../../../core/classes/uploads/upload-state-transitions';
import { canCancelUpload, hasFailed, isPaused, isUploadBusy } from '../../../core/classes/uploads/upload-state-rules';
import { uploadValidationStatus } from '../../../core/classes/uploads/upload-validation';
import { DeviceIdentity } from '../../../core/device/device-identity';
import { UploadPhase } from '../../../core/enums/upload-phase';
import { AppError } from '../../../core/errors/app-error.model';
import { ChunkReceipt } from '../../../core/interfaces/uploads/chunk-receipt';
import { UploadCheckpoint } from '../../../core/interfaces/uploads/upload-checkpoint';
import { UploadPlan } from '../../../core/interfaces/uploads/upload-plan';
import { UploadState } from '../../../core/interfaces/uploads/upload-state';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { ChunkedUploadApiService } from '../../../core/services/chunked-upload-api.service';
import { ChunkedUploadMappingService } from '../../../core/services/chunked-upload-mapping.service';
import { ChunkTransferService } from './chunk-transfer.service';

@Injectable()
export class ChunkedUploadService {
  private readonly destroyRefService = inject(DestroyRef);
  private readonly chunkTransferService = inject(ChunkTransferService);
  private readonly chunkedUploadApiService = inject(ChunkedUploadApiService);
  private readonly chunkedUploadMappingService = inject(ChunkedUploadMappingService);
  private readonly roomSessionService = inject(RoomSessionService);
  private readonly deviceIdentityService = inject(DeviceIdentity);

  private readonly uploadState = signal<UploadState>(idleState());

  public readonly state = computed(() => this.uploadState());

  private readonly progressTracker = new UploadProgressTracker();
  private requestSubscription: Subscription | undefined;
  private clockSubscription: Subscription | undefined;
  private uploadId: string | undefined;
  private file: File | undefined;
  private plan: UploadPlan | undefined;

  constructor() {
    this.destroyRefService.onDestroy(() => this.cancel());
  }

  public start(file: File): void {
    if (isUploadBusy(this.state())) {
      return;
    }
    this.uploadState.set(idleState());
    const room = this.roomSessionService.room();
    const status = room === null ? 404 : uploadValidationStatus(file.name, file.size);
    if (this.hasValidationError(status)) {
      this.receiveError({ kind: 'client', status, message: '' });
      return;
    }
    this.beginUpload(file, room!.code);
  }

  public resume(): void {
    const uploadId = this.uploadId;
    if (!isPaused(this.state()) || !this.hasUploadId(uploadId)) {
      return;
    }
    this.progressTracker.resume(Date.now());
    this.uploadState.update(resumedState);
    this.runTransfer(this.chunkedUploadApiService.getStatus(uploadId).pipe(
      switchMap(checkpoint => this.continueFrom(checkpoint)),
    ));
  }

  public cancel(): void {
    if (!canCancelUpload(this.state(), this.hasUploadId(this.uploadId))) {
      return;
    }
    this.requestSubscription?.unsubscribe();
    const uploadId = this.uploadId;
    if (!this.hasUploadId(uploadId)) {
      this.receiveCancellation('Upload cancelled.');
      return;
    }
    if (hasFailed(this.state())) {
      this.cleanupFailedUpload(uploadId);
      return;
    }
    this.abortUpload(uploadId);
  }

  private beginUpload(file: File, roomCode: string): void {
    const now = Date.now();
    this.file = file;
    this.plan = undefined;
    this.progressTracker.start(file.size, now);
    this.uploadState.set(uploadingState(file.name, this.progressTracker.snapshot(now)));
    const request = this.chunkedUploadMappingService.toRequest(file, roomCode, this.deviceIdentityService.deviceId);
    this.runTransfer(this.chunkedUploadApiService.init(request).pipe(
      tap(plan => this.receivePlan(plan)),
      switchMap(() => this.sendMissingChunks()),
    ));
  }

  private runTransfer(transfer: Observable<ChunkReceipt>): void {
    this.startClock();
    this.requestSubscription = transfer.pipe(
      tap(receipt => this.acknowledge(receipt)),
      finalize(() => this.clockSubscription?.unsubscribe()),
    ).subscribe({
      complete: () => this.confirmCompletion(),
      error: (error: AppError) => this.receiveTransferError(error),
    });
  }

  private receivePlan(plan: UploadPlan): void {
    this.uploadId = plan.uploadId;
    this.plan = plan;
    this.progressTracker.usePlan(plan);
  }

  private sendMissingChunks(): Observable<ChunkReceipt> {
    return this.chunkTransferService.sendChunks(this.file!, this.plan!, this.progressTracker.missingIndexes());
  }

  private continueFrom(checkpoint: UploadCheckpoint): Observable<ChunkReceipt> {
    if (this.settle(checkpoint)) {
      return EMPTY;
    }
    this.progressTracker.restore(checkpoint.receivedIndexes);
    this.refreshProgress();
    return this.sendMissingChunks();
  }

  private acknowledge(receipt: ChunkReceipt): void {
    this.progressTracker.acknowledge(receipt.index);
    if (receipt.acknowledgement.isCompleted) {
      this.receiveCompletion(receipt.acknowledgement.fileId);
      return;
    }
    this.refreshProgress();
  }

  // The chunk stream ended without a COMPLETED acknowledgement: the server may still be assembling.
  private confirmCompletion(): void {
    const uploadId = this.uploadId;
    if (this.state().phase !== UploadPhase.Uploading || !this.hasUploadId(uploadId)) {
      return;
    }
    this.requestSubscription = this.chunkTransferService.confirmTerminal(uploadId).subscribe({
      next: checkpoint => this.settle(checkpoint),
      error: (error: AppError) => this.receiveTransferError(error),
    });
  }

  private settle(checkpoint: UploadCheckpoint): boolean {
    if (checkpoint.isCompleted) {
      this.receiveCompletion(checkpoint.fileId);
    } else if (checkpoint.isAborted) {
      this.receiveError({ kind: 'client', status: 409, message: '' });
    } else if (checkpoint.isFailed) {
      this.receiveError({ kind: 'server', status: 500, message: '' });
    }
    return isTerminalCheckpoint(checkpoint);
  }

  private startClock(): void {
    this.clockSubscription?.unsubscribe();
    this.clockSubscription = interval(500).subscribe(() => this.refreshProgress());
  }

  private refreshProgress(): void {
    this.uploadState.update(state => withProgress(state, this.progressTracker.snapshot(Date.now())));
  }

  private receiveCompletion(fileId: string | null): void {
    this.uploadId = undefined;
    this.uploadState.update(state => completedState(state, fileId, this.progressTracker.completedSnapshot(Date.now())));
  }

  private receiveTransferError(error: AppError): void {
    if (this.chunkTransferService.isStillProcessing(error)) {
      this.pause(error.message);
      return;
    }
    const uploadId = this.uploadId;
    const action = transferErrorAction(error, this.hasUploadId(uploadId));
    if (action === 'reconcile') {
      this.reconcileConflict(uploadId!, error);
    } else if (action === 'pause') {
      this.pause(this.progressTracker.connectionLostMessage());
    } else {
      this.receiveError(error);
    }
  }

  private reconcileConflict(uploadId: string, conflict: AppError): void {
    this.requestSubscription = this.chunkedUploadApiService.getStatus(uploadId).subscribe({
      next: checkpoint => {
        if (!this.settle(checkpoint)) {
          this.receiveError(conflict);
        }
      },
      error: (statusError: AppError) => isRetryable(statusError.status)
        ? this.pause(this.progressTracker.connectionLostMessage()) : this.receiveError(conflict),
    });
  }

  private pause(message: string): void {
    this.progressTracker.pause(Date.now());
    this.uploadState.update(state => pausedState(state, message));
  }

  private receiveError(error: AppError): void {
    this.uploadState.update(state => errorState(state, uploadErrorMessage(error)));
    const uploadId = this.uploadId;
    if (this.hasUploadId(uploadId)) {
      this.cleanupFailedUpload(uploadId);
    }
  }

  private abortUpload(uploadId: string): void {
    this.uploadState.update(cancellingState);
    this.chunkedUploadApiService.abort(uploadId).subscribe({
      next: () => this.receiveCancellation('Upload cancelled.'),
      error: (error: AppError) => isAlreadyTerminal(error)
        ? this.receiveCancellation(uploadErrorMessage(error)) : this.receiveCleanupError(error),
    });
  }

  private receiveCancellation(message: string): void {
    this.uploadId = undefined;
    this.uploadState.update(state => cancelledState(state, message));
  }

  private cleanupFailedUpload(uploadId: string): void {
    this.uploadState.update(cleaningUpState);
    this.chunkedUploadApiService.abort(uploadId).subscribe({
      next: () => this.finishFailedCleanup(),
      error: (error: AppError) => isAlreadyTerminal(error)
        ? this.finishFailedCleanup() : this.receiveCleanupError(error),
    });
  }

  private finishFailedCleanup(): void {
    this.uploadId = undefined;
    this.uploadState.update(cleanedUpState);
  }

  private receiveCleanupError(error: AppError): void {
    this.uploadState.update(state => cleanupFailedState(state, uploadErrorMessage(error)));
  }

  private hasValidationError(status: number | null): status is number {
    return status !== null;
  }

  private hasUploadId(uploadId: string | undefined): uploadId is string {
    return uploadId !== undefined;
  }
}
