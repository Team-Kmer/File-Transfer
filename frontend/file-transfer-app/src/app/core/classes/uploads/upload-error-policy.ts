import { AppError } from '../../errors/app-error.model';
import { isRetryable } from './retry-policy';

export type TransferErrorAction = 'pause' | 'reconcile' | 'fail';

export function transferErrorAction(error: AppError, hasUploadId: boolean): TransferErrorAction {
  if (!hasUploadId) {
    return 'fail';
  }
  if (error.status === 409) {
    return 'reconcile';
  }
  return isRetryable(error.status) ? 'pause' : 'fail';
}

export function isAlreadyTerminal(error: AppError): boolean {
  return error.status === 404 || error.status === 409;
}
