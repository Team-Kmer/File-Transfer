import { TestBed } from '@angular/core/testing';
import { ClipboardService } from './clipboard.service';

describe('ClipboardService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes the code through the native clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await TestBed.inject(ClipboardService).copy('012345')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('012345');
  });

  it('reports clipboard unavailability on an insecure origin', async () => {
    vi.stubGlobal('navigator', {});
    expect(await TestBed.inject(ClipboardService).copy('012345')).toBe(false);
  });

  it('reports denied clipboard access without an unhandled rejection', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    expect(await TestBed.inject(ClipboardService).copy('012345')).toBe(false);
  });
});
