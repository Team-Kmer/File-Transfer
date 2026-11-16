import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  concatMap, EMPTY, finalize, from, interval, Observable, retry, Subscription, switchMap, tap, throwError, timer,
} from 'rxjs';
import { chunkRange } from '../../../core/classes/uploads/chunk-math';
import { computeProgress } from '../../../core/classes/uploads/upload-progress';
import { isRetryable, retryDelayMs } from '../../../core/classes/uploads/retry-policy';
import { uploadErrorMessage } from '../../../core/classes/uploads/upload-error-message';
import { uploadValidationStatus } from '../../../core/classes/uploads/upload-validation';
import { DeviceIdentity } from '../../../core/device/device-identity';
import { UploadPhase } from '../../../core/enums/upload-phase';
import { AppError } from '../../../core/errors/app-error.model';
import { ChunkAcknowledgement } from '../../../core/interfaces/uploads/chunk-acknowledgement';
import { ProgressSnapshot } from '../../../core/interfaces/uploads/progress-snapshot';
import { UploadCheckpoint } from '../../../core/interfaces/uploads/upload-checkpoint';
import { UploadPlan } from '../../../core/interfaces/uploads/upload-plan';
import { UploadState } from '../../../core/interfaces/uploads/upload-state';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { ChunkedUploadApiService } from '../../../core/services/chunked-upload-api.service';
import { ChunkedUploadMappingService } from '../../../core/services/chunked-upload-mapping.service';

@Injectable()
export class ChunkedUploadService {
  private readonly destroyRefService = inject(DestroyRef);
  private readonly chunkedUploadApiService = inject(ChunkedUploadApiService);
  private readonly chunkedUploadMappingService = inject(ChunkedUploadMappingService);
  private readonly roomSessionService = inject(RoomSessionService);
  private readonly deviceIdentityService = inject(DeviceIdentity);

  private readonly uploadState = signal<UploadState>(this.emptyState());

  public readonly state = computed(() => this.uploadState());

  private readonly maxRetries = 3;
  private requestSubscription: Subscription | undefined;
  private clockSubscription: Subscription | undefined;
  private uploadId: string | undefined;
  private file: File | undefined;
  private plan: UploadPlan | undefined;
  private acknowledgedIndexes = new Set<number>();
  private startedAt = 0;
  private pausedAt = 0;

  constructor() {
    this.destroyRefService.onDestroy(() => this.cancel());
  }

  public start(file: File): void {
    if (this.isBusy()) {
      return;
    }
    this.uploadState.set(this.emptyState());
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
    if (!this.isPausedState() || !this.hasUploadId(uploadId)) {
      return;
    }
    this.startedAt += Date.now() - this.pausedAt;
    this.uploadState.update(state => ({ ...state, phase: UploadPhase.Uploading, message: '' }));
    this.startClock();
    this.requestSubscription = this.chunkedUploadApiService.getStatus(uploadId).pipe(
      switchMap(checkpoint => this.continueFrom(checkpoint)),
      finalize(() => this.clockSubscription?.unsubscribe()),
    ).subscribe({ error: (error: AppError) => this.receiveTransferError(error) });
  }

  public cancel(): void {
    if (!this.canCancel()) {
      return;
    }
    this.requestSubscription?.unsubscribe();
    const uploadId = this.uploadId;
    if (!this.hasUploadId(uploadId)) {
      this.receiveCancellation('Upload cancelled.');
      return;
    }
    if (this.isErrorState()) {
      this.cleanupFailedUpload(uploadId);
      return;
    }
    this.abortUpload(uploadId);
  }

  private emptyState(): UploadState {
    return {
      phase: UploadPhase.Idle, filename: '', progress: computeProgress(0, 0, 0, 0),
      fileId: null, message: '', isCleaningUp: false, cleanupMessage: '',
    };
  }

  private beginUpload(file: File, roomCode: string): void {
    this.file = file;
    this.plan = undefined;
    this.acknowledgedIndexes = new Set<number>();
    this.startedAt = Date.now();
    this.uploadState.set({
      ...this.emptyState(), phase: UploadPhase.Uploading, filename: file.name,
      progress: computeProgress(0, file.size, this.startedAt, this.startedAt),
    });
    this.startClock();
    const request = this.chunkedUploadMappingService.toRequest(file, roomCode, this.deviceIdentityService.deviceId);
    this.requestSubscription = this.chunkedUploadApiService.init(request).pipe(
      tap(initialized => this.receivePlan(initialized)),
      switchMap(initialized => this.sendChunks(file, initialized)),
      finalize(() => this.clockSubscription?.unsubscribe()),
    ).subscribe({ error: (error: AppError) => this.receiveTransferError(error) });
  }

  private receivePlan(initialized: UploadPlan): void {
    this.uploadId = initialized.uploadId;
    this.plan = initialized;
  }

  private startClock(): void {
    this.clockSubscription?.unsubscribe();
    this.clockSubscription = interval(500).subscribe(() => this.refreshProgress());
  }

  private continueFrom(checkpoint: UploadCheckpoint): Observable<ChunkAcknowledgement> {
    if (checkpoint.isAborted) {
      return throwError(() => this.alreadyTerminalError());
    }
    if (checkpoint.isCompleted) {
      this.receiveCompletion(checkpoint.fileId);
      return EMPTY;
    }
    this.acknowledgedIndexes = new Set(checkpoint.receivedIndexes);
    this.refreshProgress();
    return this.sendChunks(this.file!, this.plan!);
  }

  private alreadyTerminalError(): AppError {
    return { kind: 'client', status: 409, message: '' };
  }

  private canCancel(): boolean {
    const state = this.state();
    return !state.isCleaningUp && (
      state.phase === UploadPhase.Uploading || this.isPausedState()
      || this.isErrorState() && this.hasUploadId(this.uploadId)
    );
  }

  private hasValidationError(status: number | null): status is number {
    return status !== null;
  }

  private hasUploadId(uploadId: string | undefined): uploadId is string {
    return uploadId !== undefined;
  }

  private isAlreadyTerminal(error: AppError): boolean {
    return error.status === 404 || error.status === 409;
  }

  private isErrorState(): boolean {
    return this.state().phase === UploadPhase.Error;
  }

  private isPausedState(): boolean {
    return this.state().phase === UploadPhase.Paused;
  }

  private isBusy(): boolean {
    const state = this.state();
    return state.phase === UploadPhase.Uploading || state.phase === UploadPhase.Cancelling
      || this.isPausedState() || state.isCleaningUp || state.cleanupMessage.length > 0;
  }

  private canPause(error: AppError): boolean {
    return isRetryable(error.status) && this.hasUploadId(this.uploadId);
  }

  private abortUpload(uploadId: string): void {
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Cancelling, isCleaningUp: true, cleanupMessage: '',
      progress: this.stoppedProgress(state.progress),
    }));
    this.chunkedUploadApiService.abort(uploadId).subscribe({
      next: () => this.receiveCancellation('Upload cancelled.'),
      error: (error: AppError) => this.receiveAbortError(error),
    });
  }

  private receiveCancellation(message: string): void {
    this.uploadId = undefined;
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Cancelled, message, isCleaningUp: false, cleanupMessage: '',
      progress: this.stoppedProgress(state.progress),
    }));
  }

  private receiveAbortError(error: AppError): void {
    if (this.isAlreadyTerminal(error)) {
      this.receiveCancellation(uploadErrorMessage(error));
      return;
    }
    this.markCleanupError(error);
  }

  private cleanupFailedUpload(uploadId: string): void {
    this.uploadState.update(state => ({ ...state, isCleaningUp: true, cleanupMessage: '' }));
    this.chunkedUploadApiService.abort(uploadId).subscribe({
      next: () => this.finishFailedCleanup(),
      error: (error: AppError) => this.receiveFailedCleanupError(error),
    });
  }

  private receiveFailedCleanupError(error: AppError): void {
    if (this.isAlreadyTerminal(error)) {
      this.finishFailedCleanup();
      return;
    }
    this.markCleanupError(error);
  }

  private finishFailedCleanup(): void {
    this.uploadId = undefined;
    this.uploadState.update(state => ({ ...state, isCleaningUp: false, cleanupMessage: '' }));
  }

  private markCleanupError(error: AppError): void {
    const cleanupMessage = uploadErrorMessage(error);
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Error, isCleaningUp: false, cleanupMessage,
      message: state.message.length > 0 ? state.message : cleanupMessage, progress: this.stoppedProgress(state.progress),
    }));
  }

  private sendChunks(file: File, initialized: UploadPlan): Observable<ChunkAcknowledgement> {
    return from(this.missingIndexes(initialized)).pipe(
      concatMap(index => this.sendOne(file, initialized, index)),
    );
  }

  private missingIndexes(initialized: UploadPlan): number[] {
    return Array.from({ length: initialized.totalChunks }, (unusedChunk, index) => index)
      .filter(index => !this.acknowledgedIndexes.has(index));
  }

  private sendOne(file: File, initialized: UploadPlan, index: number): Observable<ChunkAcknowledgement> {
    const { start, end } = chunkRange(index, initialized.chunkSize, file.size);
    return this.chunkedUploadApiService.sendChunk(initialized.uploadId, index, file.slice(start, end)).pipe(
      retry({
        count: this.maxRetries,
        delay: (error: AppError, attempt) => isRetryable(error.status)
          ? timer(retryDelayMs(attempt)) : throwError(() => error),
      }),
      tap(response => this.acknowledge(response, index)),
    );
  }

  private acknowledge(response: ChunkAcknowledgement, index: number): void {
    this.acknowledgedIndexes.add(index);
    if (response.isCompleted) {
      this.receiveCompletion(response.fileId);
      return;
    }
    this.refreshProgress();
  }

  private receiveCompletion(fileId: string | null): void {
    this.uploadId = undefined;
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Completed, fileId,
      progress: computeProgress(state.progress.totalBytes, state.progress.totalBytes, this.startedAt, Date.now()),
    }));
  }

  private acknowledgedBytes(): number {
    const file = this.file;
    const plan = this.plan;
    if (file === undefined || plan === undefined) {
      return 0;
    }
    return Array.from(this.acknowledgedIndexes).reduce((total, index) => {
      const { start, end } = chunkRange(index, plan.chunkSize, file.size);
      return total + end - start;
    }, 0);
  }

  private refreshProgress(): void {
    this.uploadState.update(state => ({
      ...state, progress: computeProgress(
        this.acknowledgedBytes(), state.progress.totalBytes, this.startedAt, Date.now(),
      ),
    }));
  }

  private stoppedProgress(progress: ProgressSnapshot): ProgressSnapshot {
    return { ...progress, bytesPerSecond: 0, remainingSeconds: null };
  }

  private receiveTransferError(error: AppError): void {
    if (this.canPause(error)) {
      this.pause();
      return;
    }
    this.receiveError(error);
  }

  private pause(): void {
    this.pausedAt = Date.now();
    const received = this.acknowledgedIndexes.size;
    const total = this.plan?.totalChunks ?? 0;
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Paused, progress: this.stoppedProgress(state.progress),
      message: `Connection lost. ${received} of ${total} chunks received.`,
    }));
  }

  private receiveError(error: AppError): void {
    this.uploadState.update(state => ({
      ...state, phase: UploadPhase.Error, message: uploadErrorMessage(error),
      progress: this.stoppedProgress(state.progress),
    }));
    const uploadId = this.uploadId;
    if (this.hasUploadId(uploadId)) {
      this.cleanupFailedUpload(uploadId);
    }
  }
}
