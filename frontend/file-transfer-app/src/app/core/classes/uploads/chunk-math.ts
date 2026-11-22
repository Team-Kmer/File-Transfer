import { ChunkRange } from '../../interfaces/uploads/chunk-range';

export function chunkRange(index: number, chunkSize: number, sizeBytes: number): ChunkRange {
  const start = index * chunkSize;
  return { start, end: Math.min(start + chunkSize, sizeBytes) };
}
