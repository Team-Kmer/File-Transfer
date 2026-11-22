import { UploadProgressTracker } from './upload-progress-tracker';

describe('UploadProgressTracker', () => {
  const plan = { uploadId: 'upload-1', chunkSize: 5, totalChunks: 3 };

  it('counts only acknowledged bytes, including a shorter last chunk', () => {
    const tracker = new UploadProgressTracker();
    tracker.start(12, 0);
    expect(tracker.snapshot(0).sentBytes).toBe(0);
    tracker.usePlan(plan);
    tracker.acknowledge(0);
    tracker.acknowledge(2);
    expect(tracker.snapshot(1000)).toMatchObject({ sentBytes: 7, totalBytes: 12, bytesPerSecond: 7 });
    expect(tracker.missingIndexes()).toEqual([1]);
    expect(tracker.receivedChunks()).toBe(2);
    expect(tracker.totalChunks()).toBe(3);
    expect(tracker.connectionLostMessage()).toBe('Connection lost. 2 of 3 chunks received.');
  });

  it('replaces acknowledged chunks with the server checkpoint', () => {
    const tracker = new UploadProgressTracker();
    tracker.start(12, 0);
    tracker.usePlan(plan);
    tracker.acknowledge(0);
    tracker.restore([1, 2]);
    expect(tracker.missingIndexes()).toEqual([0]);
    expect(tracker.snapshot(1000).sentBytes).toBe(7);
  });

  it('leaves paused time out of the speed and reports a full snapshot on completion', () => {
    const tracker = new UploadProgressTracker();
    tracker.start(10, 0);
    tracker.usePlan({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
    tracker.acknowledge(0);
    tracker.pause(1000);
    tracker.resume(9000);
    expect(tracker.snapshot(10000).bytesPerSecond).toBe(2.5);
    expect(tracker.completedSnapshot(10000)).toMatchObject({ sentBytes: 10, percent: 100 });
  });

  it('starts a new upload from zero', () => {
    const tracker = new UploadProgressTracker();
    tracker.start(12, 0);
    tracker.usePlan(plan);
    tracker.acknowledge(0);
    tracker.start(20, 5000);
    expect(tracker.missingIndexes()).toEqual([]);
    expect(tracker.snapshot(5000)).toMatchObject({ sentBytes: 0, totalBytes: 20 });
  });
});
