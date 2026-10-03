package com.filetransfer.rooms;

import jakarta.validation.constraints.NotBlank;

public record JoinRoomRequest(
        @NotBlank String deviceId,
        @NotBlank String name
) {
}
