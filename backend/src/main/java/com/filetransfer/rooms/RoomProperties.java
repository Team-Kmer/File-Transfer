package com.filetransfer.rooms;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.rooms")
public record RoomProperties(
        Duration ttl
) {
}
