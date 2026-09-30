package com.filetransfer.file.chunked;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class UploadSession {

    private final UUID uploadId;
    private final String filename;
    private final long sizeBytes;
    private final String mimeType;
    private final String roomCode;
    private final long chunkSize;
    private final int totalChunks;
    private final Set<Integer> receivedChunks = ConcurrentHashMap.newKeySet();
    private final Instant createdAt;
    private volatile UploadStatus status;

    public UploadSession(UUID uploadId, String filename, long sizeBytes, String mimeType,
                         String roomCode, long chunkSize, int totalChunks, Instant createdAt) {
        this.uploadId = uploadId;
        this.filename = filename;
        this.sizeBytes = sizeBytes;
        this.mimeType = mimeType;
        this.roomCode = roomCode;
        this.chunkSize = chunkSize;
        this.totalChunks = totalChunks;
        this.createdAt = createdAt;
        this.status = UploadStatus.INITIALIZED;
    }

    public UUID uploadId() { return uploadId; }
    public String filename() { return filename; }
    public long sizeBytes() { return sizeBytes; }
    public String mimeType() { return mimeType; }
    public String roomCode() { return roomCode; }
    public long chunkSize() { return chunkSize; }
    public int totalChunks() { return totalChunks; }
    public Set<Integer> receivedChunks() { return receivedChunks; }
    public Instant createdAt() { return createdAt; }
    public UploadStatus status() { return status; }

    void markAborted() {
        this.status = UploadStatus.ABORTED;
    }
}