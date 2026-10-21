package com.filetransfer.file.chunked;

import java.util.List;
import java.util.stream.IntStream;

public record UploadStatusResponse(
        int totalChunks,
        int received,
        List<Integer> missing,
        int percent,
        UploadStatus status
) {
    public static UploadStatusResponse from(UploadSession session) {
        int total = session.totalChunks();
        List<Integer> missing = IntStream.range(0, total)
                .filter(index -> !session.receivedChunks().contains(index))
                .boxed()
                .toList();
        int received = total - missing.size();
        int percent = received * 100 / total;
        return new UploadStatusResponse(total, received, missing, percent, session.status());
    }
}