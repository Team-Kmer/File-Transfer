import { ProgressSnapshot } from '../../interfaces/uploads/progress-snapshot';
import { UploadPlan } from '../../interfaces/uploads/upload-plan';
import { chunkRange } from './chunk-math';
import { computeProgress } from './upload-progress';

export class UploadProgressTracker {
  private acknowledged = new Set<number>();
  private plan: UploadPlan | undefined;
  private sizeBytes = 0;
  private startedAt = 0;
  private pausedAt = 0;

  public start(sizeBytes: number, now: number): void {
    this.acknowledged = new Set<number>();
    this.plan = undefined;
    this.sizeBytes = sizeBytes;
    this.startedAt = now;
  }

  public usePlan(plan: UploadPlan): void {
    this.plan = plan;
  }

  public acknowledge(index: number): void {
    this.acknowledged.add(index);
  }

  public restore(receivedIndexes: number[]): void {
    this.acknowledged = new Set(receivedIndexes);
  }

  public pause(now: number): void {
    this.pausedAt = now;
  }

  public resume(now: number): void {
    this.startedAt += now - this.pausedAt;
  }

  public missingIndexes(): number[] {
    return Array.from({ length: this.totalChunks() }, (unusedChunk, index) => index)
      .filter(index => !this.acknowledged.has(index));
  }

  public receivedChunks(): number {
    return this.acknowledged.size;
  }

  public totalChunks(): number {
    return this.plan?.totalChunks ?? 0;
  }

  public snapshot(now: number): ProgressSnapshot {
    return computeProgress(this.acknowledgedBytes(), this.sizeBytes, this.startedAt, now);
  }

  public completedSnapshot(now: number): ProgressSnapshot {
    return computeProgress(this.sizeBytes, this.sizeBytes, this.startedAt, now);
  }

  private acknowledgedBytes(): number {
    const plan = this.plan;
    if (plan === undefined) {
      return 0;
    }
    return Array.from(this.acknowledged).reduce((total, index) => {
      const { start, end } = chunkRange(index, plan.chunkSize, this.sizeBytes);
      return total + end - start;
    }, 0);
  }
}
