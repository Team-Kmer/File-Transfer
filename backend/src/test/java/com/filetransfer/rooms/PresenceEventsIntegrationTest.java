package com.filetransfer.rooms;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.converter.SimpleMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_CORS_LAN_ORIGIN=http://192.168.1.10:4200")
@ActiveProfiles("dev")
class PresenceEventsIntegrationTest {

    private static final String ORIGIN = "http://localhost:4200";

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private RoomService roomService;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new SimpleMessageConverter());
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    @Test
    void membersAreNotifiedWhenADeviceConnectsAndDisconnects() throws Exception {
        String code = roomService.create().getCode();
        roomService.joinRoom(code, "device-1", "MacBook");
        roomService.joinRoom(code, "device-2", "Pixel 8");

        StompSession first = connect("device-1", code);
        BlockingQueue<String> events = subscribe(first, code);
        // The simple broker sends no receipt, so give the SUBSCRIBE frame time to register
        Thread.sleep(200);

        StompSession second = connect("device-2", code);
        subscribe(second, code);

        String joined = awaitEvent(events, "DEVICE_JOINED", "device-2");
        assertThat(joined)
                .contains("\"roomCode\":\"" + code + "\"")
                .contains("\"timestamp\":")
                .contains("\"name\":\"Pixel 8\"")
                .contains("\"deviceCount\":2");

        second.disconnect();

        String left = awaitEvent(events, "DEVICE_LEFT", "device-2");
        assertThat(left).contains("\"payload\":{\"deviceId\":\"device-2\"}");
        assertThat(roomService.isMember(code, "device-2")).isTrue();

        first.disconnect();
    }

    private BlockingQueue<String> subscribe(StompSession session, String code) {
        BlockingQueue<String> events = new LinkedBlockingQueue<>();
        session.subscribe("/topic/rooms/" + code, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                events.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });
        return events;
    }

    private String awaitEvent(BlockingQueue<String> events, String type, String deviceId) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            String event = events.poll(500, TimeUnit.MILLISECONDS);
            if (event != null
                    && event.contains("\"type\":\"" + type + "\"")
                    && event.contains("\"deviceId\":\"" + deviceId + "\"")) {
                return event;
            }
        }
        throw new AssertionError("No " + type + " event for " + deviceId);
    }

    private StompSession connect(String deviceId, String code) throws Exception {
        WebSocketHttpHeaders handshakeHeaders = new WebSocketHttpHeaders();
        handshakeHeaders.setOrigin(ORIGIN);
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("deviceId", deviceId);
        connectHeaders.add("roomCode", code);
        return stompClient
                .connectAsync("ws://localhost:" + port + "/ws", handshakeHeaders, connectHeaders,
                        new StompSessionHandlerAdapter() {})
                .get(10, TimeUnit.SECONDS);
    }
}