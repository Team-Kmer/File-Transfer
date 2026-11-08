import { AppError } from '../errors/app-error.model';
import { roomErrorMessage } from './room-error-message';

describe('roomErrorMessage', () => {
  it.each<[number | undefined, string]>([
    [0, 'Network error'],
    [400, 'Invalid room code'],
    [404, 'Unknown or expired code'],
    [409, 'Session full'],
    [500, 'Server error, please try again'],
    [503, 'Server error, please try again'],
    [undefined, 'Something went wrong. Please try again later.'],
  ])('maps status %s without using the backend message', (status, expected) => {
    const error: AppError = { kind: 'unknown', status, message: 'Session full' };
    expect(roomErrorMessage(error)).toBe(expected);
    expect(roomErrorMessage({ ...error, message: 'Unknown or expired code' })).toBe(expected);
  });
});
