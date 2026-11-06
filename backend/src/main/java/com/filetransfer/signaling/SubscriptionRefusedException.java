package com.filetransfer.signaling;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.MessagingException;

public class SubscriptionRefusedException extends MessagingException {

    private final HttpStatus status;

    public SubscriptionRefusedException(HttpStatus status, String description) {
        super(description);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}