export interface ChunkAcknowledgement {
  isCompleted: boolean;
  fileId: string | null;
}
