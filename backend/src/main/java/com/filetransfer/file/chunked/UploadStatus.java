package com.filetransfer.file.chunked;

public enum UploadStatus {
    INITIALIZED,
    IN_PROGRESS,
    COMPLETED,
    ASSEMBLING,
    FAILED,
    ABORTED
}