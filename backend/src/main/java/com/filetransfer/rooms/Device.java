package com.filetransfer.rooms;

import java.time.Instant;

public record Device(
        String deviceId,
        String name,
        Instant joinedAt
) {
}
