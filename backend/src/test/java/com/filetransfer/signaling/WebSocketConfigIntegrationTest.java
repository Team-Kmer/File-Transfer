package com.filetransfer.signaling;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_CORS_LAN_ORIGIN=http://192.168.1.10:4200")
@ActiveProfiles("dev")
class WebSocketConfigIntegrationTest {

    private static final String LOCAL_ORIGIN = "http://localhost:4200";
    private static final String LAN_ORIGIN = "http://192.168.1.10:4200";
    private static final String UNKNOWN_ORIGIN = "http://evil.example.com";

    @Value("${local.server.port}")
    private int port;

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
    void echoRoundTripFromLocalOrigin() throws Exception {
        assertEchoRoundTrip(LOCAL_ORIGIN);
    }

    @Test
    void handshakeFromLanOriginIsAccepted() throws Exception {
        assertEchoRoundTrip(LAN_ORIGIN);
    }

    @Test
    void handshakeFromUnknownOriginIsRejected() {
        assertThatThrownBy(() -> connect(UNKNOWN_ORIGIN))
                .isInstanceOf(ExecutionException.class)
                .rootCause()
                .hasMessageContaining("403");
    }

    private void assertEchoRoundTrip(String origin) throws Exception {
        StompSession session = connect(origin);
        BlockingQueue<String> received = new LinkedBlockingQueue<>();

        session.subscribe("/topic/echo", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return String.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.add((String) payload);
            }
        });

        // The simple broker sends no receipt, so give the SUBSCRIBE frame time to register
        Thread.sleep(200);
        session.send("/app/echo", "hello");

        assertThat(received.poll(5, TimeUnit.SECONDS)).isEqualTo("hello");
        session.disconnect();
    }

    private StompSession connect(String origin) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setOrigin(origin);
        return stompClient
                .connectAsync("ws://localhost:" + port + "/ws", headers, new StompSessionHandlerAdapter() {})
                .get(10, TimeUnit.SECONDS);
    }
}