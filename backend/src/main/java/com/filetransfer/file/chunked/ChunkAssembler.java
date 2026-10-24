package com.filetransfer.file.chunked;

import com.filetransfer.file.FileMetadata;
import com.filetransfer.file.FileStorageService;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.IntStream;


@Component
public class ChunkAssembler {

    private final FileStorageService storageService;

    public ChunkAssembler(FileStorageService storageService) {
        this.storageService = storageService;
    }

    public FileMetadata assemble(UploadSession session, Path sessionDirectory) {
        List<Path> parts = IntStream.range(0, session.totalChunks())
                .mapToObj(index -> sessionDirectory.resolve(index + ".part"))
                .toList();
        verifyParts(parts, session.sizeBytes());

        return storageService.store(session.filename(), session.mimeType(), output -> {
            for (Path part : parts) {
                Files.copy(part, output);
            }
        });
    }

    private void verifyParts(List<Path> parts, long expectedSize) {
        long totalSize = 0;
        try {
            for (Path part : parts) {
                if (!Files.isRegularFile(part)) {
                    throw new IllegalStateException("Missing chunk file: " + part.getFileName());
                }
                totalSize += Files.size(part);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read chunk files", exception);
        }
        if (totalSize != expectedSize) {
            throw new IllegalStateException(
                    "Chunks total " + totalSize + " bytes, expected " + expectedSize);
        }
    }
}