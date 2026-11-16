import { Injectable } from '@angular/core';
import { UploadPhase } from '../../../core/enums/upload-phase';
import { ProgressSnapshot } from '../../../core/interfaces/uploads/progress-snapshot';
import { UploadState } from '../../../core/interfaces/uploads/upload-state';
import { UploadDisplay } from '../interfaces/upload-display';
import { UploadProgressDisplay } from '../interfaces/upload-progress-display';

@Injectable()
export class UploadPresentationService {
  private readonly units = ['KB', 'MB', 'GB'];
  public present(state: UploadState): UploadDisplay {
    const isUploading = state.phase === UploadPhase.Uploading;
    const isCompleted = state.phase === UploadPhase.Completed;
    const isError = state.phase === UploadPhase.Error;
    const isPaused = state.phase === UploadPhase.Paused;
    const message = this.statusMessage(state);
    return {
      filename: state.filename, progress: state.progress, message, isUploading, isCompleted, isError, isPaused,
      canCancel: isUploading || isPaused,
      fileId: state.fileId ?? '', statusIcon: isCompleted ? '✓' : '',
      isBusy: this.isBusy(state), isCleaningUp: state.isCleaningUp,
      cleanupMessage: state.cleanupMessage, hasCleanupError: state.cleanupMessage.length > 0,
      hasFilename: state.filename.length > 0,
      hasStatusMessage: !isError && message.length > 0 && !state.isCleaningUp,
      hasCompletedFile: isCompleted && state.fileId !== null,
      canShowMetrics: isUploading || isCompleted,
      hasProgress: state.progress.totalBytes > 0,
    };
  }

  public presentProgress(progress: ProgressSnapshot, canShowMetrics = true): UploadProgressDisplay {
    return {
      percent: Math.floor(progress.percent), percentLabel: `${Math.floor(progress.percent)}%`,
      bytesLabel: `${this.formatBytes(progress.sentBytes)} / ${this.formatBytes(progress.totalBytes)}`,
      speedLabel: canShowMetrics && progress.bytesPerSecond > 0 ? `${this.formatBytes(progress.bytesPerSecond)}/s` : '—',
      remainingLabel: canShowMetrics ? this.formatRemaining(progress.remainingSeconds) : '—',
      cells: Array.from({ length: 100 }, (unusedCell, index) => index < progress.filledCells),
    };
  }

  private isBusy(state: UploadState): boolean {
    return state.phase === UploadPhase.Uploading || state.phase === UploadPhase.Cancelling
      || state.phase === UploadPhase.Paused || state.isCleaningUp || state.cleanupMessage.length > 0;
  }

  private statusMessage(state: UploadState): string {
    switch (state.phase) {
      case UploadPhase.Uploading: return 'Uploading…';
      case UploadPhase.Cancelling: return 'Cancelling…';
      case UploadPhase.Completed: return 'Upload complete';
      default: return state.message;
    }
  }

  private formatBytes(bytes: number): string {
    if (this.isBelowKilobyte(bytes)) {
      return `${Math.floor(bytes)} B`;
    }
    const unitIndex = Math.min(2, Math.floor(Math.log(bytes) / Math.log(1024)) - 1);
    return `${(bytes / 1024 ** (unitIndex + 1)).toFixed(1)} ${this.units[unitIndex]}`;
  }

  private formatRemaining(seconds: number | null): string {
    if (!this.hasRemainingTime(seconds)) {
      return '—';
    }
    const roundedSeconds = Math.max(0, Math.ceil(seconds));
    const paddedSeconds = String(roundedSeconds % 60).padStart(2, '0');
    if (this.hasHours(roundedSeconds)) {
      const hours = Math.floor(roundedSeconds / 3600);
      const minutes = String(Math.floor(roundedSeconds / 60) % 60).padStart(2, '0');
      return `${hours} h ${minutes} min ${paddedSeconds} s`;
    }
    if (this.hasMinutes(roundedSeconds)) {
      return `${Math.floor(roundedSeconds / 60)} min ${paddedSeconds} s`;
    }
    return `${roundedSeconds} s`;
  }

  private hasHours(seconds: number): boolean {
    return seconds >= 3600;
  }

  private hasMinutes(seconds: number): boolean {
    return seconds >= 60;
  }

  private isBelowKilobyte(bytes: number): boolean {
    return bytes < 1024;
  }

  private hasRemainingTime(seconds: number | null): seconds is number {
    return seconds !== null;
  }
}
