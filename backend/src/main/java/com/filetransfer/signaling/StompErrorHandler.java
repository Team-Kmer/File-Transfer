package com.filetransfer.signaling;

import com.filetransfer.error.ApiError;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.Message;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

import java.time.Clock;

@Component
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    private final MessageConverter messageConverter;
    private final Clock clock;

    public StompErrorHandler(@Lazy @Qualifier("brokerMessageConverter") MessageConverter messageConverter,
                             Clock clock) {
        this.messageConverter = messageConverter;
        this.clock = clock;
    }

    @Override
    public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
        SubscriptionRefusedException refusal = findRefusal(ex);
        if (refusal == null) {
            return super.handleClientMessageProcessingError(clientMessage, ex);
        }
        StompHeaderAccessor clientHeaders = StompHeaderAccessor.wrap(clientMessage);
        ApiError body = new ApiError(
                clock.instant(),
                refusal.getStatus().value(),
                refusal.getStatus().getReasonPhrase(),
                refusal.getMessage(),
                clientHeaders.getDestination()
        );
        Message<?> json = messageConverter.toMessage(body, null);

        StompHeaderAccessor errorHeaders = StompHeaderAccessor.create(StompCommand.ERROR);
        errorHeaders.setMessage(refusal.getMessage());
        errorHeaders.setContentType(MimeTypeUtils.APPLICATION_JSON);
        errorHeaders.setLeaveMutable(true);
        return MessageBuilder.createMessage((byte[]) json.getPayload(), errorHeaders.getMessageHeaders());
    }

    private SubscriptionRefusedException findRefusal(Throwable ex) {
        for (Throwable current = ex; current != null; current = current.getCause()) {
            if (current instanceof SubscriptionRefusedException refusal) {
                return refusal;
            }
        }
        return null;
    }
}