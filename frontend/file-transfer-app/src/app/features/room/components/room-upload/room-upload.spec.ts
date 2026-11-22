import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { DeviceIdentity } from '../../../../core/device/device-identity';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { RoomSessionService } from '../../../../core/rooms/room-session.service';
import { RoomUpload } from './room-upload';

describe('RoomUpload', () => {
  const endpoint = `${environment.apiBaseUrl}/files/upload`;
  let fixture: ComponentFixture<RoomUpload>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(),
      { provide: DeviceIdentity, useValue: { deviceId: 'device-1' } },
    ] });
    TestBed.inject(RoomSessionService).room.set({
      code: '012345', createdAt: '', expiresAt: '', devices: [],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RoomUpload);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  it('uploads a selected file and renders acknowledged progress and completion', () => {
    chooseFile(new File(['abcdefghij'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    fixture.detectChanges();
    expect(page().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50');
    expect(page().querySelectorAll('.is-filled')).toHaveLength(50);
    http.expectOne(`${endpoint}/upload-1/chunks/1`).flush({ status: 'COMPLETED', fileId: 'file-1' });
    fixture.detectChanges();
    expect(page().textContent).toContain('Upload complete');
    expect(page().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(false);
  });

  function chooseFile(file: File): void {
    const input = page().querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function page(): HTMLElement {
    return fixture.nativeElement;
  }
  it('starts a dropped file and lets the user cancel from the rendered control', () => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [new File(['hello'], 'drop.txt')] } });
    page().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    const chunk = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    fixture.detectChanges();
    page().querySelector<HTMLButtonElement>('.cancel-button')!.click();
    expect(chunk.cancelled).toBe(true);
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
    fixture.detectChanges();
    expect(page().textContent).toContain('Upload cancelled.');
  });

  it('shows the same blocked-file message for local and server validation', () => {
    chooseFile(new File(['x'], 'blocked.EXE'));
    expect(page().querySelector('[role=alert]')?.textContent).toBe('Blocked file type');
    http.expectNone(() => true);
    chooseFile(new File(['x'], 'allowed.txt'));
    http.expectOne(`${endpoint}/init`).flush({}, { status: 415, statusText: 'Blocked' });
    fixture.detectChanges();
    expect(page().querySelector('[role=alert]')?.textContent).toBe('Blocked file type');
  });

  it('aborts the active upload when its view is destroyed', () => {
    chooseFile(new File(['hello'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    const chunk = http.expectOne(`${endpoint}/upload-1/chunks/0`);
    fixture.destroy();
    expect(chunk.cancelled).toBe(true);
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
  });

  it('starts with an empty state when another room creates its uploader', () => {
    chooseFile(new File(['hello'], 'cancel-me.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-old', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-old/chunks/0`);
    fixture.destroy();
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-old` }).flush(null);
    TestBed.inject(RoomSessionService).room.set({ code: '749277', createdAt: '', expiresAt: '', devices: [] });
    fixture = TestBed.createComponent(RoomUpload);
    fixture.detectChanges();
    expect(page().textContent).not.toContain('cancel-me.bin');
    expect(page().textContent).not.toContain('Upload cancelled.');
    expect(page().querySelector('[role=progressbar]')).toBeNull();
  });

  it('replaces speed and remaining time with unknown values after cancellation', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1000);
    chooseFile(new File(['abcdefghij'], 'cancel.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
    vi.setSystemTime(2000);
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    http.expectOne(`${endpoint}/upload-1/chunks/1`);
    fixture.detectChanges();
    page().querySelector<HTMLButtonElement>('.cancel-button')!.click();
    http.expectOne(`${endpoint}/upload-1`).flush(null);
    fixture.detectChanges();
    expect(page().querySelector('.progress-details')?.textContent).toBe('Average speed—Time remaining—');
    vi.useRealTimers();
  });

  it('shows cleanup failures and blocks selection until cleanup is retried', () => {
    failSelectedUpload();
    const cleanup = http.expectOne(`${endpoint}/upload-1`);
    fixture.detectChanges();
    expect(page().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true);
    expect(page().querySelector('.progress-details')?.textContent).toBe('Average speed—Time remaining—');
    cleanup.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(page().querySelector('.cleanup-error')?.textContent).toContain('Server error');
    page().querySelector<HTMLButtonElement>('.cleanup-retry')!.click();
    http.expectOne(`${endpoint}/upload-1`).flush(null);
    fixture.detectChanges();
    expect(page().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(false);
    expect(page().querySelector('[role=alert]')?.textContent).toBe('Blocked file type');
  });

  function failSelectedUpload(): void {
    chooseFile(new File(['abcdefghij'], 'failed.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    http.expectOne(`${endpoint}/upload-1/chunks/1`)
      .flush({}, { status: 415, statusText: 'Blocked' });
  }

  it('ignores an old uploader cleanup response after a new uploader is created', () => {
    chooseFile(new File(['hello'], 'old.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-old', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-old/chunks/0`);
    fixture.destroy();
    const cleanup = http.expectOne(`${endpoint}/upload-old`);
    expect(cleanup.cancelled).toBe(false);
    fixture = TestBed.createComponent(RoomUpload);
    fixture.detectChanges();
    cleanup.flush(null);
    fixture.detectChanges();
    expect(page().textContent).not.toContain('old.bin');
    expect(page().textContent).not.toContain('Upload cancelled.');
    expect(page().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(false);
  });

  it('keeps the idle panel free of empty status and filename elements', () => {
    expect(page().querySelector('.filename')).toBeNull();
    expect(page().querySelector('.upload-status')).toBeNull();
    expect(page().querySelector('.upload-icon')?.textContent).toBe('↑');
  });

  it('identifies a completed upload with success styling and its confirmed file id', () => {
    chooseFile(new File(['hello'], 'complete.bin'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'COMPLETED', fileId: 'file-1' });
    fixture.detectChanges();
    expect(page().querySelector('.upload-success')?.textContent).toContain('Upload complete');
    expect(page().querySelector('.completed-file-id')?.textContent).toContain('file-1');
  });

  it('keeps the drop highlight when the pointer moves between children', () => {
    page().dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(page().classList.contains('is-dragging')).toBe(true);
    page().querySelector('h2')!.dispatchEvent(new MouseEvent('dragleave', {
      bubbles: true, relatedTarget: page().querySelector('.file-chooser'),
    }));
    fixture.detectChanges();
    expect(page().classList.contains('is-dragging')).toBe(true);
    page().dispatchEvent(new MouseEvent('dragleave', { bubbles: true, relatedTarget: document.body }));
    fixture.detectChanges();
    expect(page().classList.contains('is-dragging')).toBe(false);
  });

  it('keeps nested drag highlighting when the browser omits relatedTarget', () => {
    page().dispatchEvent(new Event('dragenter', { bubbles: true, cancelable: true }));
    page().dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    page().querySelector('h2')!.dispatchEvent(new Event('dragenter', { bubbles: true, cancelable: true }));
    page().dispatchEvent(new MouseEvent('dragleave', { bubbles: true }));
    fixture.detectChanges();
    expect(page().classList.contains('is-dragging')).toBe(true);
    page().querySelector('h2')!.dispatchEvent(new MouseEvent('dragleave', { bubbles: true }));
    fixture.detectChanges();
    expect(page().classList.contains('is-dragging')).toBe(false);
  });

  it('pauses after exhausted retries and resumes only the missing chunks from the rendered control', () => {
    vi.useFakeTimers();
    chooseFile(new File(['abcdefghij'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 2 });
    http.expectOne(`${endpoint}/upload-1/chunks/0`).flush({ status: 'IN_PROGRESS' });
    failChunkFourTimes(1);
    fixture.detectChanges();
    expect(page().querySelector('.upload-paused')?.textContent).toContain('1 of 2 chunks received');
    expect(page().querySelector<HTMLInputElement>('input[type=file]')!.disabled).toBe(true);
    expect(page().textContent).toContain('Average speed—');
    page().querySelector<HTMLButtonElement>('.resume-button')!.click();
    http.expectOne({ method: 'GET', url: `${endpoint}/upload-1` }).flush({
      uploadId: 'upload-1', filename: 'notes.txt', sizeBytes: 10, status: 'IN_PROGRESS',
      chunkSize: 5, totalChunks: 2, receivedIndexes: [0],
    });
    http.expectOne(`${endpoint}/upload-1/chunks/1`).flush({ status: 'COMPLETED', fileId: 'file-9' });
    fixture.detectChanges();
    expect(page().textContent).toContain('Upload complete');
    expect(page().querySelector('.resume-button')).toBeNull();
  });

  it('aborts a paused upload from the rendered cancel control', () => {
    vi.useFakeTimers();
    chooseFile(new File(['hello'], 'notes.txt'));
    http.expectOne(`${endpoint}/init`).flush({ uploadId: 'upload-1', chunkSize: 5, totalChunks: 1 });
    failChunkFourTimes(0);
    fixture.detectChanges();
    page().querySelector<HTMLButtonElement>('.cancel-button')!.click();
    http.expectOne({ method: 'DELETE', url: `${endpoint}/upload-1` }).flush(null);
    fixture.detectChanges();
    expect(page().textContent).toContain('Upload cancelled.');
  });

  function failChunkFourTimes(index: number): void {
    for (const delay of [0, 500, 1000, 2000]) {
      vi.advanceTimersByTime(delay);
      http.expectOne(`${endpoint}/upload-1/chunks/${index}`).flush({}, { status: 503, statusText: 'Unavailable' });
    }
  }

});
