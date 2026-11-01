package com.filetransfer.signaling;

import com.filetransfer.rooms.Device;

public record DeviceJoinedPayload(
        Device device,
        int deviceCount,
        int maxDevices
) {
}