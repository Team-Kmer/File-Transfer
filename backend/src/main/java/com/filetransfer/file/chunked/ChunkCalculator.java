package com.filetransfer.file.chunked;

public final class ChunkCalculator {

    private ChunkCalculator() {
    }

    public static int totalChunks(long sizeBytes, long chunkSize) {
        if (sizeBytes <= 0) {
            throw new IllegalArgumentException("sizeBytes must be positive");
        }
        if (chunkSize <= 0) {
            throw new IllegalArgumentException("chunkSize must be positive");
        }
        return Math.toIntExact(Math.ceilDiv(sizeBytes, chunkSize));
    }
}