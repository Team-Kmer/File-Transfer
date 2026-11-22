import { UploadCheckpoint } from '../../interfaces/uploads/upload-checkpoint';

export function isTerminalCheckpoint(checkpoint: UploadCheckpoint): boolean {
  return checkpoint.isCompleted || checkpoint.isAborted || checkpoint.isFailed;
}
