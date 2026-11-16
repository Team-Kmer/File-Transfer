import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../core/../../environments/environment';
import { DeviceIdentity } from '../../../core/device/device-identity';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { RoomSessionService } from '../../../core/rooms/room-session.service';
import { ChunkedUploadService } from './chunked-upload.service';

describe('ChunkedUploadService', () => {
  const endpoint = `${environment.apiBaseUrl}/files/upload`;
  let service: ChunkedUploadService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(1000);
    TestBed.configureTestingModule({ providers: [ChunkedUploadService,
      provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
      { provide: DeviceIdentity, useValue: { deviceId: 'device-1' } },
    ] });
    TestBed.inject(RoomSessionService).room.set({
      code: '012345', createdAt: '', expiresAt: '', devices: [],
    });
    service = TestBed.inject(ChunkedUploadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    http.verify();
    vi.useRealTimers();
  });

  it('sends lazy sequential chunks with metadata and only acknowledges successful bytes', () => {
    initializeArchive();
    acknowledgeFirstArchiveChunk();
    http.expectOne(`${endpoint}/upload-1/chunks/1`).flush({ status: 'IN_PROGRESS' });
    const final = http.expectOne(`${endpoint}/upload-1/chunks/2`);
    expect(final.request.body.size).toBe(2);
    final.flush({ status: 'COMPLETED', fileId: 'file-1' });
    expect(service.state()).toMatchObject({
      phase: 'completed', fileId: 'file-1', progress: { sentBytes: 12, percent: 100 },
    });
  });

  function initializeArchive(): void {
    service.start(new File(['abcdefghijkl'], 'archive.zip', { type: 'application/zip' }));
    const init = http.expectOne(`${endpoint}/init`);
    expect(init.request.method).toBe('POST');
    expect(init.request.body).toEqual({
      filename: 'archive.zip', sizeBytes: 12, mimeType: 'application/zip',
      roomCode: '012345', deviceId: 'device-1',
    });
    init.flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 3 });
  }

  function acknowledgeFirstArchiveChunk(): void {
    const first = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    expect(first.request.method).toBe('PUT');
    expect(first.request.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(first.request.body.size).toBe(5);
    expect(service.state().progress.sentBytes).toBe(0);
    http.expectNone(`${endpoint}/upload-1/chunks/1`);
    vi.advanceTimersByTime(1000);
    first.flush({ status: 'IN_PROGRESS' });
    expect(service.state().progress.sentBytes).toBe(5);
    expect(service.state().progress.filledCells).toBe(41);
    expect(service.state().progress.bytesPerSecond).toBe(5);
  }

  it('retries the same chunk twice before continuing without inflated progress', () => {
    beginUpload();
    failChunk(0, 503);
    expect(service.state().progress.sentBytes).toBe(0);
    vi.advanceTimersByTime(499);
    http.expectNone(`${endpoint}/upload-1/chunks/0`);
    vi.advanceTimersByTime(1);
    failChunk(0, 503);
    vi.advanceTimersByTime(999);
    http.expectNone(`${endpoint}/upload-1/chunks/0`);
    vi.advanceTimersByTime(1);
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    expect(service.state().progress.sentBytes).toBe(5);
    http.expectOne(`${endpoint}/upload-1/chunks/1`).flush({ status: 'COMPLETED', fileId: 'file-2' });
    expect(service.state().fileId).toBe('file-2');
  });

  it('preserves the upload after four retryable failures at 500, 1000 and 2000 milliseconds', () => {
    beginUpload();
    failChunk(0, 503);
    for (const delay of [500, 1000, 2000]) {
      vi.advanceTimersByTime(delay);
      failChunk(0, 503);
    }
    expect(service.state().phase).toBe('paused');
    expect(service.state().progress.sentBytes).toBe(0);
    http.expectNone({ method: 'DELETE', url: `${endpoint}/upload-1` });
    vi.advanceTimersByTime(5000);
    http.expectNone(() => true);
  });

  it.each([400, 404, 409, 413, 415])('does not retry a final chunk failure with status %s', status => {
    beginUpload();
    failChunk(0, status);
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
    expect(service.state().phase).toBe('error');
    vi.advanceTimersByTime(4000);
    http.expectNone(() => true);
  });

  function beginUpload(): void {
    service.start(new File(['abcdefghij'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
  }

  function failChunk(index: number, status: number): void {
    http.expectOne(`${endpoint}/upload-1/chunks/${index}`)
      .flush({}, { status, statusText: 'Failure' });
  }

  it('updates speed and remaining time while the next chunk is pending', () => {
    beginUpload();
    vi.advanceTimersByTime(1000);
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    expect(service.state().progress.remainingSeconds).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(service.state().progress.bytesPerSecond).toBe(2.5);
    expect(service.state().progress.remainingSeconds).toBe(2);
    http.expectOne(`${endpoint}/upload-1/chunks/1`).flush({ status: 'COMPLETED', fileId: 'file-3' });
    const finalProgress = service.state().progress;
    vi.advanceTimersByTime(5000);
    expect(service.state().progress).toEqual(finalProgress);
  });

  it('cancels the in-flight PUT, aborts once and allows a later upload', () => {
    beginUpload();
    const chunk = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    service.cancel();
    expect(chunk.cancelled).toBe(true);
    service.cancel();
    const abort = http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` });
    abort.flush(null);
    expect(service.state().phase).toBe('cancelled');
    vi.advanceTimersByTime(5000);
    http.expectNone(() => true);
    service.start(new File(['next'], 'next.txt'));
    http.expectOne(`${endpoint}/init`).flush({}, { status: 415, statusText: 'Blocked' });
    expect(service.state().message).toBe('Blocked file type');
  });

  it('cancels the retry timer without starting another PUT', () => {
    beginUpload();
    failChunk(0, 503);
    service.cancel();
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
    vi.advanceTimersByTime(4000);
    http.expectNone(() => true);
    expect(service.state().progress.sentBytes).toBe(0);
  });

  it('cancels init without a DELETE when no uploadId is known', () => {
    service.start(new File(['hello'], 'notes.txt'));
    const init = http.expectOne(`${endpoint}/init`);
    service.cancel();
    expect(init.cancelled).toBe(true);
    expect(service.state().phase).toBe('cancelled');
    http.expectNone(() => true);
  });

  it('treats DELETE 409 as an already finished or cancelled outcome', () => {
    beginUpload();
    http.expectOne(`${endpoint}/upload-1/chunks/0`);
    service.cancel();
    http.expectOne(`${endpoint}/upload-1`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(service.state().phase).toBe('cancelled');
    expect(service.state().message).toBe('Upload already completed or cancelled');
    expect(service.state().fileId).toBeNull();
  });

  it('reports an abort failure and does not hide it behind cancellation', () => {
    beginUpload();
    http.expectOne(`${endpoint}/upload-1/chunks/0`);
    service.cancel();
    http.expectOne(`${endpoint}/upload-1`).flush({}, { status: 500, statusText: 'Failure' });
    expect(service.state().phase).toBe('error');
    expect(service.state().message).toContain('Server error');
    service.cancel();
    http.expectOne(`${endpoint}/upload-1`).flush(null);
  });

  it('leaves an acknowledged completion intact when cancel is called', () => {
    service.start(new File(['hello'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'COMPLETED', fileId: 'file-4' });
    service.cancel();
    expect(service.state().fileId).toBe('file-4');
    expect(service.state().phase).toBe('completed');
    http.expectNone(() => true);
  });

  it.each([
    ['danger.EXE', 1, 'Blocked file type'],
    ['empty.txt', 0, 'Unable to upload this file.'],
    ['large.zip', 2147483649, 'File too large (max 2 GB)'],
  ])('rejects invalid selection %s before making HTTP requests', (filename, size, message) => {
    const file = new File(['x'], filename);
    Object.defineProperty(file, 'size', { value: size });
    service.start(file);
    expect(service.state().phase).toBe('error');
    expect(service.state().message).toBe(message);
    http.expectNone(() => true);
  });

  it('reports a missing room without starting an upload', () => {
    TestBed.inject(RoomSessionService).clearRoom();
    service.start(new File(['hello'], 'notes.txt'));
    expect(service.state().message).toBe('Upload or session expired');
    http.expectNone(() => true);
  });

  it('ignores a second selection while uploading and while cancellation is pending', () => {
    beginUpload();
    const chunk = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    service.start(new File(['second'], 'second.txt'));
    expect(service.state().filename).toBe('notes.txt');
    http.expectNone(`${endpoint}/init`);
    service.cancel();
    expect(chunk.cancelled).toBe(true);
    service.start(new File(['third'], 'third.txt'));
    expect(service.state().phase).toBe('cancelling');
    http.expectNone(`${endpoint}/init`);
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
  });

  it('clears the previous completed file before reporting a selection validation error', () => {
    service.start(new File(['hello'], 'ft44-check.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'COMPLETED', fileId: 'file-1' });
    service.start(new File(['x'], 'virus.exe'));
    expect(service.state()).toMatchObject({
      phase: 'error', filename: '', fileId: null,
      progress: { sentBytes: 0, totalBytes: 0, percent: 0, filledCells: 0 },
      message: 'Blocked file type',
    });
    http.expectNone(() => true);
  });

  it('does not abort a completed upload after later validation fails', () => {
    service.start(new File(['hello'], 'completed.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'COMPLETED', fileId: 'file-1' });
    service.start(new File(['x'], 'virus.exe'));
    service.cancel();
    http.expectNone(() => true);
    expect(service.state().phase).toBe('error');
  });

  it('preserves the upload error when cleanup fails and allows cleanup to be retried', () => {
    beginUpload();
    failChunk(0, 415);
    http.expectOne(`${endpoint}/upload-1`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.state()).toMatchObject({
      phase: 'error', message: 'Blocked file type', isCleaningUp: false,
      cleanupMessage: 'Server error. Please try again later.',
    });
    service.start(new File(['next'], 'next.txt'));
    http.expectNone(`${endpoint}/init`);
    service.cancel();
    http.expectOne(`${endpoint}/upload-1`).flush(null);
    expect(service.state()).toMatchObject({ phase: 'error', message: 'Blocked file type', cleanupMessage: '' });
  });

  it.each([404, 409])('accepts cleanup status %s without losing the original upload error', status => {
    beginUpload();
    failChunk(0, 415);
    http.expectOne(`${endpoint}/upload-1`).flush({}, { status, statusText: 'Gone' });
    expect(service.state()).toMatchObject({ phase: 'error', message: 'Blocked file type', isCleaningUp: false });
    service.cancel();
    http.expectNone(() => true);
  });

  it('reconciles server acknowledgements before resuming only missing chunks', () => {
    initializeArchive();
    http.expectOne(endpoint + '/upload-1/chunks/0').flush({ status: 'IN_PROGRESS' });
    failChunk(1, 503);
    for (const delay of [500, 1000, 2000]) {
      vi.advanceTimersByTime(delay);
      failChunk(1, 503);
    }
    expect(service.state().phase).toBe('paused');
    service.resume();
    http.expectOne({ method: 'GET', url: endpoint + '/upload-1' }).flush({
      uploadId: 'upload-1', filename: 'archive.zip', sizeBytes: 12, status: 'IN_PROGRESS',
      chunkSize: 5, totalChunks: 3, receivedIndexes: [0, 1],
    });
    expect(service.state().progress.sentBytes).toBe(10);
    http.expectNone(endpoint + '/init');
    http.expectNone(endpoint + '/upload-1/chunks/1');
    http.expectOne(endpoint + '/upload-1/chunks/2').flush({ status: 'COMPLETED', fileId: 'resumed-file' });
    expect(service.state()).toMatchObject({ phase: 'completed', fileId: 'resumed-file', progress: { sentBytes: 12 } });
  });

});
