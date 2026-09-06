import {UploadedFileState} from '../interface/UploadedFileState';
import {patchState, signalStore, withMethods, withState} from '@ngrx/signals';


const initialState: UploadedFileState = {
  uploadedFiles: [],
};

export const UploadedFileStore = signalStore(
  withState(initialState),

  withMethods(store => ({

    addUploadedFile(file: File): void {
      patchState(store, state => ({
        uploadedFiles: [...state.uploadedFiles, file],
      }));
    },

  }))
);
