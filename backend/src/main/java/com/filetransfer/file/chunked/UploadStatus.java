package com.filetransfer.file.chunked;

public enum UploadStatus {
    INITIALIZED,
    IN_PROGRESS,
    COMPLETED,
    ASSEMBLING,
    FAILED,
    ABORTED;

    public UploadStatus visibleStatus() {
        return this == ASSEMBLING ? IN_PROGRESS : this;
    }
}