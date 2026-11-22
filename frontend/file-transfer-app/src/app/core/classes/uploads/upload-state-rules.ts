import { UploadPhase } from '../../enums/upload-phase';
import { UploadState } from '../../interfaces/uploads/upload-state';

export function isPaused(state: UploadState): boolean {
  return state.phase === UploadPhase.Paused;
}

export function hasFailed(state: UploadState): boolean {
  return state.phase === UploadPhase.Error;
}

export function isUploadBusy(state: UploadState): boolean {
  return state.phase === UploadPhase.Uploading || state.phase === UploadPhase.Cancelling
    || isPaused(state) || state.isCleaningUp || state.cleanupMessage.length > 0;
}

export function canCancelUpload(state: UploadState, hasUploadId: boolean): boolean {
  return !state.isCleaningUp && (
    state.phase === UploadPhase.Uploading || isPaused(state) || hasFailed(state) && hasUploadId
  );
}
