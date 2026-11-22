import { Injectable } from '@angular/core';
import { ChunkStatus } from '../enums/chunk-status';
import { ChunkAcknowledgement } from '../interfaces/uploads/chunk-acknowledgement';
import { ChunkReceivedResponse } from '../interfaces/uploads/chunk-received-response';
import { InitUploadResponse } from '../interfaces/uploads/init-upload-response';
import { UploadPlan } from '../interfaces/uploads/upload-plan';
import { InitUploadRequest } from '../interfaces/uploads/init-upload-request';
import { UploadServerStatus } from '../enums/upload-server-status';
import { UploadCheckpoint } from '../interfaces/uploads/upload-checkpoint';
import { UploadStatusResponse } from '../interfaces/uploads/upload-status-response';

@Injectable({ providedIn: 'root' })
export class ChunkedUploadMappingService {
  public toRequest(file: File, roomCode: string, deviceId: string): InitUploadRequest {
    return {
      filename: file.name, sizeBytes: file.size, mimeType: file.type,
      roomCode, deviceId,
    };
  }
  public toUploadPlan(response: InitUploadResponse): UploadPlan {
    return { uploadId: response.uploadId, chunkSize: response.chunkSize, totalChunks: response.totalChunks };
  }

  public toAcknowledgement(response: ChunkReceivedResponse): ChunkAcknowledgement {
    return { isCompleted: response.status === ChunkStatus.Completed, fileId: response.fileId ?? null };
  }

  public toCheckpoint(response: UploadStatusResponse): UploadCheckpoint {
    return {
      isCompleted: response.status === UploadServerStatus.Completed,
      isAborted: response.status === UploadServerStatus.Aborted,
      isFailed: response.status === UploadServerStatus.Failed,
      fileId: response.fileId ?? null,
      receivedIndexes: response.receivedIndexes,
    };
  }
}
