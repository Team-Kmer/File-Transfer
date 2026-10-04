package com.filetransfer.error;

public class InvalidRoomCodeException extends RuntimeException {
    public InvalidRoomCodeException(String message) {
        super(message);
    }
}
