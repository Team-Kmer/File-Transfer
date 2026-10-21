package com.filetransfer.error;

public class UploadSessionAbortedException extends RuntimeException {
    public UploadSessionAbortedException(String message) {
        super(message);
    }
}