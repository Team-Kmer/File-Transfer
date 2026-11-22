import { UploadPhase } from '../../enums/upload-phase';
import { canCancelUpload, isUploadBusy } from './upload-state-rules';
import { idleState } from './upload-state-transitions';

describe('upload state rules', () => {
  const inPhase = (phase: UploadPhase) => ({ ...idleState(), phase });

  it('is busy while uploading, paused, cancelling or cleaning up', () => {
    expect(isUploadBusy(inPhase(UploadPhase.Uploading))).toBe(true);
    expect(isUploadBusy(inPhase(UploadPhase.Paused))).toBe(true);
    expect(isUploadBusy(inPhase(UploadPhase.Cancelling))).toBe(true);
    expect(isUploadBusy({ ...idleState(), isCleaningUp: true })).toBe(true);
    expect(isUploadBusy({ ...idleState(), cleanupMessage: 'Cleanup failed' })).toBe(true);
    expect(isUploadBusy(inPhase(UploadPhase.Completed))).toBe(false);
    expect(isUploadBusy(inPhase(UploadPhase.Error))).toBe(false);
  });

  it('allows cancel while uploading or paused, and after an error only when the server still has the upload', () => {
    expect(canCancelUpload(inPhase(UploadPhase.Uploading), false)).toBe(true);
    expect(canCancelUpload(inPhase(UploadPhase.Paused), true)).toBe(true);
    expect(canCancelUpload(inPhase(UploadPhase.Error), true)).toBe(true);
    expect(canCancelUpload(inPhase(UploadPhase.Error), false)).toBe(false);
    expect(canCancelUpload(inPhase(UploadPhase.Completed), true)).toBe(false);
    expect(canCancelUpload({ ...inPhase(UploadPhase.Uploading), isCleaningUp: true }, true)).toBe(false);
  });
});
