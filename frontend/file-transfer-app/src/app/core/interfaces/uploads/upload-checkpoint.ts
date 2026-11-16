export interface UploadCheckpoint {
  isCompleted: boolean;
  isAborted: boolean;
  fileId: string | null;
  receivedIndexes: number[];
}
