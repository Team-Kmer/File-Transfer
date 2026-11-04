package com.filetransfer.error;

public class InvalidChunkException extends RuntimeException {
    public InvalidChunkException(String message) {
        super(message);
    }
}