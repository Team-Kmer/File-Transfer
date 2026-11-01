package com.filetransfer.signaling;

import com.filetransfer.error.RoomNotFoundException;
import com.filetransfer.rooms.Room;
import com.filetransfer.rooms.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;

@Component
public class PresenceEventListener {

    static final String DEVICE_JOINED = "DEVICE_JOINED";
    static final String DEVICE_LEFT = "DEVICE_LEFT";

    private static final Logger logger = LoggerFactory.getLogger(PresenceEventListener.class);

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Clock clock;
    private final Map<String, Presence> presenceBySession = new ConcurrentHashMap<>();

    public PresenceEventListener(RoomService roomService, SimpMessagingTemplate messagingTemplate, Clock clock) {
        this.roomService = roomService;
        this.messagingTemplate = messagingTemplate;
        this.clock = clock;
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (destination == null || attributes == null) {
            return;
        }
        Matcher matcher = RoomSubscriptionInterceptor.ROOM_TOPIC.matcher(destination);
        Object deviceId = attributes.get(RoomSubscriptionInterceptor.DEVICE_ID);
        if (!matcher.matches() || deviceId == null) {
            return;
        }
        Presence presence = new Presence(matcher.group(1), deviceId.toString());
        if (presenceBySession.putIfAbsent(accessor.getSessionId(), presence) != null) {
            return;
        }
        logger.info("Device {} connected to room {} ({} active sessions)",
                presence.deviceId(), presence.roomCode(), activeSessionCount());
        publishJoined(presence);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Presence presence = presenceBySession.remove(event.getSessionId());
        if (presence == null) {
            return;
        }
        logger.info("Device {} disconnected from room {} ({} active sessions)",
                presence.deviceId(), presence.roomCode(), activeSessionCount());
        if (roomService.exists(presence.roomCode())) {
            publish(presence.roomCode(), DEVICE_LEFT, new DeviceLeftPayload(presence.deviceId()));
        }
    }

    public int activeSessionCount() {
        return presenceBySession.size();
    }

    private void publishJoined(Presence presence) {
        try {
            Room room = roomService.getByCode(presence.roomCode());
            room.getDevices().stream()
                    .filter(device -> device.deviceId().equals(presence.deviceId()))
                    .findFirst()
                    .ifPresent(device -> publish(presence.roomCode(), DEVICE_JOINED,
                            new DeviceJoinedPayload(device, room.getDevices().size())));
        } catch (RoomNotFoundException exception) {
            logger.debug("Room {} expired before DEVICE_JOINED was sent", presence.roomCode());
        }
    }

    private void publish(String roomCode, String type, Object payload) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomCode,
                new RoomEvent(type, roomCode, clock.instant(), payload));
    }

    private record Presence(String roomCode, String deviceId) {
    }
}