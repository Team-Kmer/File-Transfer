export type AppErrorKind = 'network' | 'client' | 'server' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  status?: number;
}
