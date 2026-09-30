package com.filetransfer.file.chunked;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record InitUploadRequest(
        @NotBlank String filename,
        @NotNull @PositiveOrZero Long sizeBytes,
        String mimeType,
        @NotBlank String roomCode
) {
}