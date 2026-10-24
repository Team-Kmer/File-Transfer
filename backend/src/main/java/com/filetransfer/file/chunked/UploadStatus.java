package com.filetransfer.file.chunked;

public enum UploadStatus {
    INITIALIZED,
    ASSEMBLING,
    COMPLETED,
    FAILED,
    ABORTED
}