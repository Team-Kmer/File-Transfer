import { computeProgress } from './upload-progress';
import {
  cancelledState, cancellingState, cleanedUpState, cleaningUpState, cleanupFailedState, completedState, errorState,
  idleState, pausedState, resumedState, uploadingState,
} from './upload-state-transitions';

describe('upload state transitions', () => {
  const running = uploadingState('notes.txt', computeProgress(5, 10, 0, 1000));

  it('starts and resumes an upload with a clean message', () => {
    expect(idleState()).toMatchObject({ phase: 'idle', filename: '', fileId: null, message: '' });
    expect(running).toMatchObject({ phase: 'uploading', filename: 'notes.txt', progress: { sentBytes: 5 } });
    expect(resumedState(pausedState(running, 'Lost'))).toMatchObject({ phase: 'uploading', message: '' });
  });

  it('stops speed and remaining time when the upload pauses, fails or is cancelled', () => {
    for (const state of [pausedState(running, 'Lost'), errorState(running, 'Bad'), cancellingState(running),
      cancelledState(running, 'Cancelled')]) {
      expect(state.progress).toMatchObject({ sentBytes: 5, bytesPerSecond: 0, remainingSeconds: null });
    }
    expect(pausedState(running, 'Lost')).toMatchObject({ phase: 'paused', message: 'Lost' });
    expect(cancellingState(running)).toMatchObject({ phase: 'cancelling', isCleaningUp: true });
    expect(cancelledState(cancellingState(running), 'Done')).toMatchObject({ phase: 'cancelled', isCleaningUp: false });
  });

  it('records the file id on completion', () => {
    expect(completedState(running, 'file-1', computeProgress(10, 10, 0, 1000)))
      .toMatchObject({ phase: 'completed', fileId: 'file-1', progress: { percent: 100 } });
  });

  it('keeps the original error when the clean-up also fails', () => {
    const failed = errorState(running, 'Blocked file type');
    expect(cleaningUpState(failed)).toMatchObject({ isCleaningUp: true, cleanupMessage: '' });
    expect(cleanedUpState(cleaningUpState(failed))).toMatchObject({ isCleaningUp: false, phase: 'error' });
    expect(cleanupFailedState(failed, 'Network error')).toMatchObject({
      phase: 'error', message: 'Blocked file type', cleanupMessage: 'Network error',
    });
    expect(cleanupFailedState(running, 'Network error')).toMatchObject({ message: 'Network error' });
  });
});
