package com.filetransfer.file.chunked;

import com.filetransfer.error.EmptyFileException;
import com.filetransfer.error.FileTooLargeException;
import com.filetransfer.error.ResourceNotFoundException;
import com.filetransfer.error.UnsupportedFileTypeException;
import com.filetransfer.rooms.RoomService;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Service
public class ChunkedUploadService {

    private static final String DEFAULT_MIME_TYPE = "application/octet-stream";

    private final Path tmpPath;
    private final long chunkSize;
    private final long maxFileSize;
    private final RoomService roomService;
    private final FileTypeValidator fileTypeValidator;
    private final Map<UUID, UploadSession> sessionsById = new ConcurrentHashMap<>();

    public ChunkedUploadService(ChunkedUploadProperties properties,
                                RoomService roomService,
                                FileTypeValidator fileTypeValidator) {
        this.tmpPath = properties.path().resolve("tmp");
        this.chunkSize = properties.chunkSize().toBytes();
        this.maxFileSize = properties.maxFileSize().toBytes();
        this.roomService = roomService;
        this.fileTypeValidator = fileTypeValidator;
    }

    public UploadSession init(@NonNull InitUploadRequest request) {
        String filename = sanitizeFilename(request.filename());

        if (request.sizeBytes() == 0) {
            throw new EmptyFileException("Uploaded file must not be empty");
        }
        if (!roomService.exists(request.roomCode())) {
            throw new ResourceNotFoundException("Room not found: " + request.roomCode());
        }
        if (request.sizeBytes() > maxFileSize) {
            throw new FileTooLargeException(
                    "File exceeds the " + (maxFileSize / (1024 * 1024)) + "MB limit");
        }
        if (!fileTypeValidator.isAllowed(filename)) {
            throw new UnsupportedFileTypeException("File type not allowed: " + filename);
        }

        UUID uploadId = UUID.randomUUID();
        String mimeType = request.mimeType() == null || request.mimeType().isBlank()
                ? DEFAULT_MIME_TYPE
                : request.mimeType();
        UploadSession session = new UploadSession(
                uploadId,
                filename,
                request.sizeBytes(),
                mimeType,
                request.roomCode(),
                chunkSize,
                ChunkCalculator.totalChunks(request.sizeBytes(), chunkSize),
                Instant.now());

        try {
            Files.createDirectories(sessionDirectory(uploadId));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create upload directory: " + uploadId, exception);
        }

        sessionsById.put(uploadId, session);
        return session;
    }

    public Optional<UploadSession> findById(UUID uploadId) {
        return Optional.ofNullable(sessionsById.get(uploadId));
    }

    public void abort(UUID uploadId) {
        UploadSession session = sessionsById.remove(uploadId);
        if (session == null) {
            throw new ResourceNotFoundException("Upload session not found: " + uploadId);
        }
        session.markAborted();
        deleteRecursively(sessionDirectory(uploadId));
    }

    Path sessionDirectory(UUID uploadId) {
        return tmpPath.resolve(uploadId.toString());
    }

    private String sanitizeFilename(String filename) {
        int lastSeparator = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
        String name = filename.substring(lastSeparator + 1).strip();
        if (name.isEmpty() || name.equals(".") || name.equals("..")) {
            throw new EmptyFileException("Invalid filename: " + filename);
        }
        return name;
    }

    private void deleteRecursively(Path directory) {
        if (!Files.exists(directory)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(directory)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete upload directory: " + directory, exception);
        }
    }
}
