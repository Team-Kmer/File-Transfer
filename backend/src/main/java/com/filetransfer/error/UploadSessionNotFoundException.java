package com.filetransfer.error;

public class UploadSessionNotFoundException extends RuntimeException {
    public UploadSessionNotFoundException(String message) {
        super(message);
    }
}