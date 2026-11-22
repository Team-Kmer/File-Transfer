import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AppError } from '../../../core/errors/app-error.model';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { ChunkReceipt } from '../../../core/interfaces/uploads/chunk-receipt';
import { UploadCheckpoint } from '../../../core/interfaces/uploads/upload-checkpoint';
import { ChunkTransferService } from './chunk-transfer.service';

describe('ChunkTransferService', () => {
  const endpoint = `${environment.apiBaseUrl}/files/upload`;
  const plan = { uploadId: 'upload-1', chunkSize: 5, totalChunks: 3 };
  const file = new File(['abcdefghijkl'], 'archive.zip');
  let service: ChunkTransferService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
    ] });
    service = TestBed.inject(ChunkTransferService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('sends only the requested chunks, one after the other, and reports each acknowledgement', () => {
    const receipts: ChunkReceipt[] = [];
    let isComplete = false;
    service.sendChunks(file, plan, [0, 2]).subscribe({
      next: receipt => receipts.push(receipt), complete: () => isComplete = true,
    });
    const first = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    http.expectNone(`${endpoint}/upload-1/chunks/2`);
    first.flush({ status: 'IN_PROGRESS' });
    const last = http.expectOne(`${endpoint}/upload-1/chunks/2`);
    expect(last.request.body.size).toBe(2);
    last.flush({ status: 'COMPLETED', fileId: 'file-1' });
    expect(receipts).toEqual([
      { index: 0, acknowledgement: { isCompleted: false, fileId: null } },
      { index: 2, acknowledgement: { isCompleted: true, fileId: 'file-1' } },
    ]);
    expect(isComplete).toBe(true);
  });

  it('re-sends a chunk after a retryable failure but not after a final one', () => {
    let failure: AppError | undefined;
    service.sendChunks(file, plan, [0]).subscribe({ error: (error: AppError) => failure = error });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({}, { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(500);
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({}, { status: 415, statusText: 'Blocked' });
    expect(failure?.status).toBe(415);
    vi.advanceTimersByTime(5000);
    http.expectNone(() => true);
  });

  it('waits for a terminal status and gives up with the still-processing error', () => {
    const checkpoints: UploadCheckpoint[] = [];
    service.confirmTerminal('upload-1').subscribe(checkpoint => checkpoints.push(checkpoint));
    flushStatus('IN_PROGRESS');
    vi.advanceTimersByTime(500);
    flushStatus('COMPLETED');
    expect(checkpoints).toMatchObject([{ isCompleted: true }]);

    let failure: AppError | undefined;
    service.confirmTerminal('upload-1').subscribe({ error: (error: AppError) => failure = error });
    flushStatus('IN_PROGRESS');
    for (const delay of [500, 1000, 2000]) {
      vi.advanceTimersByTime(delay);
      flushStatus('IN_PROGRESS');
    }
    expect(failure !== undefined && service.isStillProcessing(failure)).toBe(true);
  });

  function flushStatus(status: string): void {
    http.expectOne({ method: 'GET', url: `${endpoint}/upload-1` }).flush({
      uploadId: 'upload-1', filename: 'archive.zip', sizeBytes: 12, status,
      chunkSize: 5, totalChunks: 3, receivedIndexes: [0, 1, 2],
    });
  }
});
