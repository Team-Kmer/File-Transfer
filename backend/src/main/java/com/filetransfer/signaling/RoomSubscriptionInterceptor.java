package com.filetransfer.signaling;

import com.filetransfer.error.InvalidRoomCodeException;
import com.filetransfer.rooms.RoomService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RoomSubscriptionInterceptor implements ChannelInterceptor {

    static final String DEVICE_ID = "deviceId";
    static final String ROOM_CODE = "roomCode";
    static final Pattern ROOM_TOPIC = Pattern.compile("/topic/rooms/([^/]+)");

    private final RoomService roomService;

    public RoomSubscriptionInterceptor(RoomService roomService) {
        this.roomService = roomService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            rememberDevice(accessor);
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            checkRoomSubscription(accessor);
        }
        return message;
    }

    private void rememberDevice(StompHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null) {
            return;
        }
        String deviceId = accessor.getFirstNativeHeader(DEVICE_ID);
        String roomCode = accessor.getFirstNativeHeader(ROOM_CODE);
        if (deviceId != null) {
            attributes.put(DEVICE_ID, deviceId);
        }
        if (roomCode != null) {
            attributes.put(ROOM_CODE, roomCode);
        }
    }

    private void checkRoomSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }
        Matcher matcher = ROOM_TOPIC.matcher(destination);
        if (!matcher.matches()) {
            return;
        }
        String code = matcher.group(1);
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object deviceId = attributes == null ? null : attributes.get(DEVICE_ID);
        Object roomCode = attributes == null ? null : attributes.get(ROOM_CODE);
        if (deviceId == null || !code.equals(roomCode) || !isMember(code, deviceId.toString())) {
            throw new MessagingException("Subscription refused to " + destination);
        }
    }

    private boolean isMember(String code, String deviceId) {
        try {
            return roomService.isMember(code, deviceId);
        } catch (InvalidRoomCodeException exception) {
            return false;
        }
    }
}