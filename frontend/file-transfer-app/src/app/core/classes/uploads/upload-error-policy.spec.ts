import { AppError } from '../../errors/app-error.model';
import { isAlreadyTerminal, transferErrorAction } from './upload-error-policy';

describe('upload error policy', () => {
  const withStatus = (status: number): AppError => ({ kind: 'server', status, message: '' });

  it('reconciles a 409, pauses on network or server errors and fails on other errors', () => {
    expect(transferErrorAction(withStatus(409), true)).toBe('reconcile');
    expect(transferErrorAction(withStatus(0), true)).toBe('pause');
    expect(transferErrorAction(withStatus(503), true)).toBe('pause');
    expect(transferErrorAction(withStatus(400), true)).toBe('fail');
    expect(transferErrorAction(withStatus(413), true)).toBe('fail');
  });

  it('fails when the server never created the upload', () => {
    expect(transferErrorAction(withStatus(409), false)).toBe('fail');
    expect(transferErrorAction(withStatus(503), false)).toBe('fail');
  });

  it('treats 404 and 409 on cleanup as an already finished upload', () => {
    expect(isAlreadyTerminal(withStatus(404))).toBe(true);
    expect(isAlreadyTerminal(withStatus(409))).toBe(true);
    expect(isAlreadyTerminal(withStatus(500))).toBe(false);
  });
});
