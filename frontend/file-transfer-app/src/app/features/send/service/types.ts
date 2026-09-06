export type UploadState =
  | { status: 'idle'}
  | { status: 'uploading'}
  | { status: 'success'; filename: string }
  | { status: 'error'; message: string }

export type PreviewKind = 'none' | 'image' | 'pdf';
