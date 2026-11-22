import { ProgressSnapshot } from '../../../core/interfaces/uploads/progress-snapshot';

export interface UploadDisplay {
  filename: string;
  message: string;
  fileId: string;
  cleanupMessage: string;
  statusIcon: string;
  isBusy: boolean;
  isUploading: boolean;
  isPaused: boolean;
  canCancel: boolean;
  isCompleted: boolean;
  isError: boolean;
  isCleaningUp: boolean;
  hasFilename: boolean;
  hasStatusMessage: boolean;
  hasCompletedFile: boolean;
  hasCleanupError: boolean;
  canShowMetrics: boolean;
  hasProgress: boolean;
  progress: ProgressSnapshot;
}
