package com.filetransfer.signaling;

import java.time.Instant;

public record RoomEvent(
        String type,
        String roomCode,
        Instant timestamp,
        Object payload
) {
}