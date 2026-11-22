import { ChunkAcknowledgement } from './chunk-acknowledgement';

export interface ChunkReceipt {
  index: number;
  acknowledgement: ChunkAcknowledgement;
}
