package com.filetransfer.file.chunked;

import java.util.UUID;

public record InitUploadResponse(UUID uploadId, long chunkSize, int totalChunks) {

    public static InitUploadResponse from(UploadSession session) {
        return new InitUploadResponse(session.uploadId(), session.chunkSize(), session.totalChunks());
    }
}