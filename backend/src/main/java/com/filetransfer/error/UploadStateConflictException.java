package com.filetransfer.error;

public class UploadStateConflictException extends RuntimeException {
    public UploadStateConflictException(String message) {
        super(message);
    }
}