export interface InitUploadRequest {
  filename: string;
  sizeBytes: number;
  mimeType?: string;
  roomCode: string;
  deviceId: string;
}
