import { uploadErrorMessage } from './upload-error-message';

describe('uploadErrorMessage', () => {
  it('maps status codes independently of backend wording', () => {
    const statuses = [413, 415, 404, 409, 0, 503, 400, undefined];
    expect(statuses.map(status => uploadErrorMessage({ status, kind: 'unknown', message: 'irrelevant' })))
      .toEqual([
        'File too large (max 2 GB)', 'Blocked file type',
        'Upload or session expired', 'Upload already completed or cancelled',
        'Network error. Check your connection.', 'Server error. Please try again later.',
        'Unable to upload this file.', 'Unable to upload this file.',
      ]);
  });
});
