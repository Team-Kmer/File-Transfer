package com.filetransfer.file.chunked;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChunkReceivedResponse(
        UUID uploadId,
        int index,
        UploadStatus status,
        int receivedChunks,
        int totalChunks,
        UUID fileId
) {
    public static ChunkReceivedResponse from(UploadSession session, int index) {
        return new ChunkReceivedResponse(
                session.uploadId(),
                index,
                session.status(),
                session.receivedChunks().size(),
                session.totalChunks(),
                null);
    }
}