import {FileMetadata} from '../../../shared/models/file-metadata.model';

export type FileListState =
  | { status: 'loading' }
  | { status: 'success', file: FileMetadata[] }
  | { status: 'error'; message: string };
