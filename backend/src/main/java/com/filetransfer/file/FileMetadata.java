package com.filetransfer.file;

import java.time.Instant;
import java.util.UUID;

public record FileMetadata(
        UUID id,
        String originalName,
        long size,
        Instant uploadDate,
        String mimeType,
        String storedFilename
) {
}
