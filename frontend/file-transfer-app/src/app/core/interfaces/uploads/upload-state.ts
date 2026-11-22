import { UploadPhase } from '../../enums/upload-phase';
import { ProgressSnapshot } from './progress-snapshot';

export interface UploadState {
  phase: UploadPhase;
  filename: string;
  progress: ProgressSnapshot;
  fileId: string | null;
  message: string;
  isCleaningUp: boolean;
  cleanupMessage: string;
}
