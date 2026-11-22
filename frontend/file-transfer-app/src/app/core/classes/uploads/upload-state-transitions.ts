import { UploadPhase } from '../../enums/upload-phase';
import { ProgressSnapshot } from '../../interfaces/uploads/progress-snapshot';
import { UploadState } from '../../interfaces/uploads/upload-state';
import { computeProgress } from './upload-progress';

export function idleState(): UploadState {
  return {
    phase: UploadPhase.Idle, filename: '', progress: computeProgress(0, 0, 0, 0),
    fileId: null, message: '', isCleaningUp: false, cleanupMessage: '',
  };
}

export function uploadingState(filename: string, progress: ProgressSnapshot): UploadState {
  return { ...idleState(), phase: UploadPhase.Uploading, filename, progress };
}

export function resumedState(state: UploadState): UploadState {
  return { ...state, phase: UploadPhase.Uploading, message: '' };
}

export function withProgress(state: UploadState, progress: ProgressSnapshot): UploadState {
  return { ...state, progress };
}

export function completedState(state: UploadState, fileId: string | null, progress: ProgressSnapshot): UploadState {
  return { ...state, phase: UploadPhase.Completed, fileId, progress };
}

export function pausedState(state: UploadState, message: string): UploadState {
  return { ...state, phase: UploadPhase.Paused, message, progress: stopped(state.progress) };
}

export function errorState(state: UploadState, message: string): UploadState {
  return { ...state, phase: UploadPhase.Error, message, progress: stopped(state.progress) };
}

export function cancellingState(state: UploadState): UploadState {
  return {
    ...state, phase: UploadPhase.Cancelling, isCleaningUp: true, cleanupMessage: '', progress: stopped(state.progress),
  };
}

export function cancelledState(state: UploadState, message: string): UploadState {
  return {
    ...state, phase: UploadPhase.Cancelled, message, isCleaningUp: false, cleanupMessage: '',
    progress: stopped(state.progress),
  };
}

export function cleaningUpState(state: UploadState): UploadState {
  return { ...state, isCleaningUp: true, cleanupMessage: '' };
}

export function cleanedUpState(state: UploadState): UploadState {
  return { ...state, isCleaningUp: false, cleanupMessage: '' };
}

export function cleanupFailedState(state: UploadState, cleanupMessage: string): UploadState {
  return {
    ...state, phase: UploadPhase.Error, isCleaningUp: false, cleanupMessage,
    message: state.message.length > 0 ? state.message : cleanupMessage, progress: stopped(state.progress),
  };
}

function stopped(progress: ProgressSnapshot): ProgressSnapshot {
  return { ...progress, bytesPerSecond: 0, remainingSeconds: null };
}
