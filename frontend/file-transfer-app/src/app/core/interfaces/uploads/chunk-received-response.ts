import { ChunkStatus } from '../../enums/chunk-status';

export interface ChunkReceivedResponse {
  uploadId: string;
  index: number;
  status: ChunkStatus;
  receivedChunks: number;
  totalChunks: number;
  fileId?: string;
}
