package com.filetransfer.file.chunked;

import com.filetransfer.error.EmptyFileException;
import com.filetransfer.error.FileTooLargeException;
import com.filetransfer.error.ResourceNotFoundException;
import com.filetransfer.error.UnsupportedFileTypeException;
import com.filetransfer.rooms.InMemoryRoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChunkedUploadServiceTest {

    private static final String ROOM = "ABC123";

    @TempDir
    Path tempDir;

    private ChunkedUploadService service;

    @BeforeEach
    void setUp() {
        ChunkedUploadProperties properties = new ChunkedUploadProperties(
                tempDir,
                DataSize.ofMegabytes(5),
                DataSize.ofMegabytes(20),
                List.of("exe", "bat"));
        InMemoryRoomService roomService = new InMemoryRoomService();
        roomService.register(ROOM);
        service = new ChunkedUploadService(properties, roomService, new FileTypeValidator(properties));
    }

    @Test
    void initCreatesSessionAndEmptyDirectory() throws IOException {
        UploadSession session = service.init(
                new InitUploadRequest("video.mp4", 11L * 1024 * 1024, "video/mp4", ROOM));

        Path directory = tempDir.resolve("tmp").resolve(session.uploadId().toString());
        assertThat(directory).isDirectory();
        try (var content = Files.list(directory)) {
            assertThat(content).isEmpty();
        }
        assertThat(session.filename()).isEqualTo("video.mp4");
        assertThat(session.mimeType()).isEqualTo("video/mp4");
        assertThat(session.roomCode()).isEqualTo(ROOM);
        assertThat(session.chunkSize()).isEqualTo(5L * 1024 * 1024);
        assertThat(session.totalChunks()).isEqualTo(3);
        assertThat(session.receivedChunks()).isEmpty();
        assertThat(session.createdAt()).isNotNull();
        assertThat(session.status()).isEqualTo(UploadStatus.INITIALIZED);
        assertThat(service.findById(session.uploadId())).contains(session);
    }

    @Test
    void initStripsPathFromFilename() {
        UploadSession session = service.init(
                new InitUploadRequest("../../etc/report.pdf", 10L, "application/pdf", ROOM));

        assertThat(session.filename()).isEqualTo("report.pdf");
    }

    @Test
    void initDefaultsMissingMimeType() {
        UploadSession session = service.init(new InitUploadRequest("notes", 10L, null, ROOM));

        assertThat(session.mimeType()).isEqualTo("application/octet-stream");
    }

    @Test
    void initRejectsEmptyFile() {
        assertThatThrownBy(() -> service.init(new InitUploadRequest("a.txt", 0L, "text/plain", ROOM)))
                .isInstanceOf(EmptyFileException.class);
    }

    @Test
    void initRejectsUnknownRoom() {
        assertThatThrownBy(() -> service.init(new InitUploadRequest("a.txt", 10L, "text/plain", "NOPE")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void initRejectsFileAboveMaxSize() {
        long tooLarge = 20L * 1024 * 1024 + 1;

        assertThatThrownBy(() -> service.init(new InitUploadRequest("a.txt", tooLarge, "text/plain", ROOM)))
                .isInstanceOf(FileTooLargeException.class);
    }

    @Test
    void initAcceptsFileExactlyAtMaxSize() {
        long maxSize = 20L * 1024 * 1024;

        UploadSession session = service.init(new InitUploadRequest("a.txt", maxSize, "text/plain", ROOM));

        assertThat(session.totalChunks()).isEqualTo(4);
    }

    @Test
    void initRejectsBlockedExtensionRegardlessOfCase() {
        assertThatThrownBy(() -> service.init(
                new InitUploadRequest("setup.EXE", 10L, "application/octet-stream", ROOM)))
                .isInstanceOf(UnsupportedFileTypeException.class);
    }

    @Test
    void initDoesNotCreateDirectoryWhenValidationFails() throws IOException {
        assertThatThrownBy(() -> service.init(new InitUploadRequest("a.bat", 10L, null, ROOM)))
                .isInstanceOf(UnsupportedFileTypeException.class);

        assertThat(tempDir.resolve("tmp")).doesNotExist();
    }

    @Test
    void abortRemovesSessionAndDeletesDirectoryWithContent() throws IOException {
        UploadSession session = service.init(new InitUploadRequest("a.txt", 10L, "text/plain", ROOM));
        Path directory = tempDir.resolve("tmp").resolve(session.uploadId().toString());
        Files.writeString(directory.resolve("0.part"), "chunk");

        service.abort(session.uploadId());

        assertThat(directory).doesNotExist();
        assertThat(service.findById(session.uploadId())).isEmpty();
        assertThat(session.status()).isEqualTo(UploadStatus.ABORTED);
    }

    @Test
    void abortRejectsUnknownId() {
        assertThatThrownBy(() -> service.abort(UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}