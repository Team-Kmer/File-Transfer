package com.filetransfer.rooms;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Room {
    private final String code;
    private final Instant createdAt;
    private final Instant expiresAt;
    private final Map<String, Device> devices = new ConcurrentHashMap<>();

    public Room(Instant createdAt, Instant expiresAt, String code) {
        this.code = code;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getCode() {
        return code;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public List<Device> getDevices() {
        return List.copyOf(devices.values());
    }

    void addDevice(Device device) {
        this.devices.put(device.deviceId(), device);
    }

    boolean isExpiredAt(Instant now) {
        return !now.isBefore(expiresAt);
    }
}
