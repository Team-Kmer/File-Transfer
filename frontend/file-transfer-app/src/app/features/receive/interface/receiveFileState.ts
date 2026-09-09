import {FileMetadata} from '../../../shared/models/file-metadata.model';
import {FileListState} from '../types/type';

export interface ReceiveFileState {
  receivedFile : FileMetadata[];
  fileListState : FileListState | null
}
