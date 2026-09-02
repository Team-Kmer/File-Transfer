package com.filetransfer.file;

import java.time.Instant;
import java.util.UUID;

public record FileResponse(
        UUID id,
        String name,
        long sizeBytes,
        Instant uploadedAt,
        String mimeType
) {
    static FileResponse from(FileMetadata metadata) {
        return new FileResponse(
                metadata.id(),
                metadata.originalName(),
                metadata.size(),
                metadata.uploadDate(),
                metadata.mimeType());
    }
}