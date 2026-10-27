package com.filetransfer.file.chunked;

import com.filetransfer.error.EmptyFileException;
import com.filetransfer.error.FileTooLargeException;
import com.filetransfer.error.RoomNotFoundException;
import com.filetransfer.error.UnsupportedFileTypeException;
import com.filetransfer.error.UploadSessionNotFoundException;
import com.filetransfer.rooms.RoomService;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;
import com.filetransfer.error.InvalidChunkException;
import com.filetransfer.error.UploadSessionAbortedException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;
import java.nio.file.StandardCopyOption;

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
            throw new RoomNotFoundException("Room not found: " + request.roomCode());
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

    public UploadSession getById(UUID uploadId) {
        UploadSession session = sessionsById.get(uploadId);
        if (session == null) {
            throw new UploadSessionNotFoundException("Upload session not found: " + uploadId);
        }
        return session;
    }

    public void abort(UUID uploadId) {
        UploadSession session = sessionsById.get(uploadId);
        if (session == null) {
            throw new UploadSessionNotFoundException("Upload session not found: " + uploadId);
        }
        if (session.status() == UploadStatus.ABORTED) {
            throw new UploadSessionAbortedException("Upload session is aborted: " + uploadId);
        }
        session.markAborted();
        deleteRecursively(sessionDirectory(uploadId));
    }

    public void receiveChunk(UUID uploadId, int index, MultipartFile chunk) {
        UploadSession session = getById(uploadId);
        if (session.status() == UploadStatus.ABORTED) {
            throw new UploadSessionAbortedException("Upload session is aborted: " + uploadId);
        }
        if (index < 0 || index >= session.totalChunks()) {
            throw new InvalidChunkException("Chunk index " + index + " is out of range [0, " + session.totalChunks() + ")");
        }
        long expectedSize = session.chunkSize();
        if (index == session.totalChunks() - 1) {
            expectedSize = session.sizeBytes() - (long) (session.totalChunks() - 1) * session.chunkSize();
        }
        long actualSize = chunk.getSize();
        if (actualSize > expectedSize) {
            throw new FileTooLargeException("Chunk " + index + " is too large: " + actualSize + " bytes, expected " + expectedSize);
        }
        if (actualSize != expectedSize) {
            throw new InvalidChunkException("Chunk " + index + " has wrong size: " + actualSize + " bytes, expected " + expectedSize);
        }
        if (!session.claimChunk(index)) {
            return;
        }
        try {
            if (session.receivedChunks().contains(index)) {
                return;
            }
            storeChunk(uploadId, index, chunk);
            recordChunk(session, index);
        } finally {
            session.releaseChunk(index);
        }
    }

    private void storeChunk(UUID uploadId, int index, MultipartFile chunk) {
        Path directory = sessionDirectory(uploadId);
        Path target = directory.resolve(index + ".part");
        Path temp = null;
        try {
            temp = Files.createTempFile(directory, index + "-", ".tmp");
            chunk.transferTo(temp);
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            if (temp != null) {
                temp.toFile().delete();
            }
            throw new IllegalStateException("Could not store chunk " + index + " of upload " + uploadId, exception);
        }
    }

    private void recordChunk(UploadSession session, int index) {
        session.receivedChunks().add(index);
        if (session.status() == UploadStatus.INITIALIZED) {
            session.markReceiving();
        }
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
