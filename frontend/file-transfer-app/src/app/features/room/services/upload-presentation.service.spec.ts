import { TestBed } from '@angular/core/testing';
import { UploadPresentationService } from './upload-presentation.service';

describe('UploadPresentationService progress labels', () => {
  let service: UploadPresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UploadPresentationService] });
    service = TestBed.inject(UploadPresentationService);
  });

  it.each([
    [1023, '1023 B'], [1024, '1.0 KB'], [1048576, '1.0 MB'], [1073741824, '1.0 GB'],
  ])('formats the byte unit boundary %s', (bytes, label) => {
    const display = service.presentProgress({
      sentBytes: bytes, totalBytes: bytes, bytesPerSecond: bytes,
      percent: 100, filledCells: 100, remainingSeconds: 0,
    });
    expect(display.bytesLabel).toBe(`${label} / ${label}`);
    expect(display.speedLabel).toBe(`${label}/s`);
    expect(display.cells.filter(isFilled => isFilled)).toHaveLength(100);
  });

  it('renders unknown speed and ETA with an empty grid', () => {
    const display = service.presentProgress({
      sentBytes: 0, totalBytes: 100, bytesPerSecond: 0,
      percent: 0, filledCells: 0, remainingSeconds: null,
    });
    expect(display.speedLabel).toBe('—');
    expect(display.remainingLabel).toBe('—');
    expect(display.cells).toHaveLength(100);
    expect(display.cells.filter(isFilled => isFilled)).toHaveLength(0);
  });

  it('rounds remaining seconds up through a minute boundary', () => {
    const display = service.presentProgress({
      sentBytes: 1, totalBytes: 3, bytesPerSecond: 1,
      percent: 33.333333333, filledCells: 33, remainingSeconds: 59.2,
    });
    expect(display.percentLabel).toBe('33%');
    expect(display.percent).toBe(33);
    expect(display.remainingLabel).toBe('1 min 00 s');
    expect(display.cells.filter(isFilled => isFilled)).toHaveLength(33);
  });
  it.each([
    [0, '0 s'], [1, '1 s'], [59, '59 s'], [65, '1 min 05 s'],
    [3600, '1 h 00 min 00 s'], [7500, '2 h 05 min 00 s'],
  ])('formats remaining seconds %s without zero-minute prefixes', (seconds, expected) => {
    const display = service.presentProgress({
      sentBytes: 1, totalBytes: 3, bytesPerSecond: 1,
      percent: 33.3, filledCells: 33, remainingSeconds: seconds,
    });
    expect(display.remainingLabel).toBe(expected);
  });

});
