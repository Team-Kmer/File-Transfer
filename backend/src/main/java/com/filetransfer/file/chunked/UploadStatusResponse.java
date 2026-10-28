package com.filetransfer.file.chunked;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UploadStatusResponse(
        UUID uploadId,
        String filename,
        long sizeBytes,
        UploadStatus status,
        long chunkSize,
        int totalChunks,
        List<Integer> receivedIndexes,
        UUID fileId
) {
    public static UploadStatusResponse from(UploadSession session) {
        List<Integer> receivedIndexes = session.receivedChunks().stream().sorted().toList();
        return new UploadStatusResponse(
                session.uploadId(),
                session.filename(),
                session.sizeBytes(),
                session.status(),
                session.chunkSize(),
                session.totalChunks(),
                receivedIndexes,
                null);
    }
}