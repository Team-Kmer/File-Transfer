export interface UploadCheckpoint {
  isCompleted: boolean;
  isAborted: boolean;
  isFailed: boolean;
  fileId: string | null;
  receivedIndexes: number[];
}
