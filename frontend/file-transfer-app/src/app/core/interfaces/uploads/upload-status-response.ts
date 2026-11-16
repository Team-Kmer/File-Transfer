import { UploadServerStatus } from '../../enums/upload-server-status';

export interface UploadStatusResponse {
  uploadId: string;
  filename: string;
  sizeBytes: number;
  status: UploadServerStatus;
  chunkSize: number;
  totalChunks: number;
  receivedIndexes: number[];
  fileId?: string;
}
