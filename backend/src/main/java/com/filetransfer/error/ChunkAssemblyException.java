package com.filetransfer.error;

public class ChunkAssemblyException extends RuntimeException {
    public ChunkAssemblyException(String message, Throwable cause) {
        super(message, cause);
    }
}