package com.filetransfer.rooms;

import java.time.Instant;
import java.util.List;

public record RoomResponse(
        String code,
        Instant createdAt,
        Instant expiresAt,
        List<Device> devices
) {
    static RoomResponse from(Room room) {
        return new RoomResponse(room.getCode(), room.getCreatedAt(), room.getExpiresAt(), room.getDevices());
    }
}
