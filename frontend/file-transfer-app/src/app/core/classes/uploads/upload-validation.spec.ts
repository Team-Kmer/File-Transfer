import { uploadValidationStatus } from './upload-validation';

describe('uploadValidationStatus', () => {
  it('rejects empty, oversized and case-insensitive blocked files while allowing 2 GiB', () => {
    expect(uploadValidationStatus('video.mp4', 104857600)).toBeNull();
    expect(uploadValidationStatus('archive.zip', 2147483648)).toBeNull();
    expect(uploadValidationStatus('archive.zip', 2147483649)).toBe(413);
    expect(uploadValidationStatus('empty.txt', 0)).toBe(400);
    expect(uploadValidationStatus('notes.EXE', 1)).toBe(415);
    expect(uploadValidationStatus('notes.ps1', 1)).toBe(415);
    expect(uploadValidationStatus('notes.exe.txt', 1)).toBeNull();
    expect(uploadValidationStatus('README', 1)).toBeNull();
  });
});
