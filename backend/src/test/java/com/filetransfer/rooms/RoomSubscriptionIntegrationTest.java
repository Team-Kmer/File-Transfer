package com.filetransfer.rooms;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_CORS_LAN_ORIGIN=http://192.168.1.10:4200")
@ActiveProfiles("dev")
class RoomSubscriptionIntegrationTest {

    private static final String ORIGIN = "http://localhost:4200";

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private RoomService roomService;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new StringMessageConverter());
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    @Test
    void memberCanSubscribeToItsRoom() throws Exception {
        Room room = roomService.create();
        roomService.joinRoom(room.getCode(), "device-1", "Pixel 8");
        ErrorCollector errors = new ErrorCollector();
        StompSession session = connect("device-1", room.getCode(), errors);

        session.subscribe("/topic/rooms/" + room.getCode(), new IgnoreFrames());

        assertThat(errors.frames.poll(1, TimeUnit.SECONDS)).isNull();
        assertThat(session.isConnected()).isTrue();
        session.disconnect();
    }

    @Test
    void nonMemberIsRefused() throws Exception {
        Room room = roomService.create();
        ErrorCollector errors = new ErrorCollector();
        StompSession session = connect("stranger", room.getCode(), errors);

        session.subscribe("/topic/rooms/" + room.getCode(), new IgnoreFrames());

        assertRefused(errors);
    }

    @Test
    void unknownRoomIsRefused() throws Exception {
        ErrorCollector errors = new ErrorCollector();
        StompSession session = connect("device-1", "000000", errors);

        session.subscribe("/topic/rooms/000000", new IgnoreFrames());

        assertRefused(errors);
    }

    @Test
    void memberOfOneRoomCannotListenToAnother() throws Exception {
        Room mine = roomService.create();
        Room other = roomService.create();
        roomService.joinRoom(mine.getCode(), "device-1", "Pixel 8");
        ErrorCollector errors = new ErrorCollector();
        StompSession session = connect("device-1", mine.getCode(), errors);

        session.subscribe("/topic/rooms/" + other.getCode(), new IgnoreFrames());

        assertRefused(errors);
    }

    private void assertRefused(ErrorCollector errors) throws InterruptedException {
        StompHeaders error = errors.frames.poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.getFirst("message")).contains("Subscription refused");
    }

    private StompSession connect(String deviceId, String roomCode, ErrorCollector handler) throws Exception {
        WebSocketHttpHeaders webSocketHeaders = new WebSocketHttpHeaders();
        webSocketHeaders.setOrigin(ORIGIN);
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("deviceId", deviceId);
        connectHeaders.add("roomCode", roomCode);
        return stompClient
                .connectAsync("ws://localhost:" + port + "/ws", webSocketHeaders, connectHeaders, handler)
                .get(10, TimeUnit.SECONDS);
    }

    private static final class ErrorCollector extends StompSessionHandlerAdapter {
        private final BlockingQueue<StompHeaders> frames = new LinkedBlockingQueue<>();

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            frames.add(headers);
        }
    }

    private static final class IgnoreFrames implements StompFrameHandler {
        @Override
        public Type getPayloadType(StompHeaders headers) {
            return String.class;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
        }
    }
}