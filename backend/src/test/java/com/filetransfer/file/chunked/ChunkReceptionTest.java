package com.filetransfer.file.chunked;

import com.filetransfer.error.FileTooLargeException;
import com.filetransfer.error.InvalidChunkException;
import com.filetransfer.error.UploadStateConflictException;
import com.filetransfer.rooms.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChunkReceptionTest {

    private static final String ROOM = "123456";
    private static final int CHUNK_SIZE = 10;
    private static final long FILE_SIZE = 25;

    @TempDir
    Path tempDir;

    private ChunkedUploadService service;
    private UploadSession session;

    @BeforeEach
    void setUp() {
        ChunkedUploadProperties properties = new ChunkedUploadProperties(
                tempDir,
                DataSize.ofBytes(CHUNK_SIZE),
                DataSize.ofMegabytes(1),
                List.of("exe"));
        RoomService roomService = mock(RoomService.class);
        when(roomService.exists(ROOM)).thenReturn(true);
        service = new ChunkedUploadService(properties, roomService, new FileTypeValidator(properties));
        session = service.init(new InitUploadRequest("notes.txt", FILE_SIZE, "text/plain", ROOM));
    }

    @Test
    void storesChunksReceivedOutOfOrder() {
        send(2, 5);
        send(0, 10);
        send(1, 10);

        assertThat(session.receivedChunks()).containsExactlyInAnyOrder(0, 1, 2);
        assertThat(part(0)).exists();
        assertThat(part(1)).exists();
        assertThat(part(2)).exists();
    }

    @Test
    void firstChunkMovesSessionToIN_PROGRESS() {
        assertThat(session.status()).isEqualTo(UploadStatus.INITIALIZED);

        send(1, 10);

        assertThat(session.status()).isEqualTo(UploadStatus.IN_PROGRESS);
    }

    @Test
    void duplicateChunkIsNotRewrittenNorCountedTwice() throws IOException {
        service.receiveChunk(session.uploadId(), 0, chunk(10, (byte) 'a'));
        service.receiveChunk(session.uploadId(), 0, chunk(10, (byte) 'b'));

        assertThat(session.receivedChunks()).containsExactly(0);
        assertThat(Files.readString(part(0))).isEqualTo("aaaaaaaaaa");
    }

    @Test
    void rejectsIndexOutOfRange() {
        assertThatThrownBy(() -> send(-1, 10)).isInstanceOf(InvalidChunkException.class);
        assertThatThrownBy(() -> send(3, 5)).isInstanceOf(InvalidChunkException.class);
        assertThat(session.receivedChunks()).isEmpty();
    }

    @Test
    void rejectsLargerChunkAsTooLarge() {
        assertThatThrownBy(() -> send(0, 11)).isInstanceOf(FileTooLargeException.class);
        assertThatThrownBy(() -> send(2, 10)).isInstanceOf(FileTooLargeException.class);
    }

    @Test
    void rejectsSmallerChunkAsInvalid() {
        assertThatThrownBy(() -> send(0, 9)).isInstanceOf(InvalidChunkException.class);
        assertThatThrownBy(() -> send(2, 4)).isInstanceOf(InvalidChunkException.class);
        assertThat(part(0)).doesNotExist();
    }

    @Test
    void rejectsChunkForAbortedSession() {
        service.abort(session.uploadId());

        assertThatThrownBy(() -> send(0, 10)).isInstanceOf(UploadStateConflictException.class);
    }

    @Test
    void handlesConcurrentChunksOnSameSession() throws Exception {
        List<Callable<Void>> tasks = new ArrayList<>();
        for (int round = 0; round < 5; round++) {
            tasks.add(() -> { send(0, 10); return null; });
            tasks.add(() -> { send(1, 10); return null; });
            tasks.add(() -> { send(2, 5); return null; });
        }

        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            for (Future<Void> result : pool.invokeAll(tasks)) {
                result.get();
            }
        } finally {
            pool.shutdown();
        }

        assertThat(session.receivedChunks()).containsExactlyInAnyOrder(0, 1, 2);
        assertThat(session.status()).isEqualTo(UploadStatus.IN_PROGRESS);
        try (var files = Files.list(service.sessionDirectory(session.uploadId()))) {
            assertThat(files.map(path -> path.getFileName().toString()))
                    .containsExactlyInAnyOrder("0.part", "1.part", "2.part");
        }
    }


    @Test
    void startupFailsWhenChunkSizeExceedsMultipartLimit() {
        ChunkedUploadProperties properties = new ChunkedUploadProperties(
                tempDir, DataSize.ofMegabytes(20), DataSize.ofGigabytes(2), List.of("exe"));

        assertThatThrownBy(() -> new ChunkSizeStartupCheck(properties, DataSize.ofMegabytes(10)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.storage.chunk-size");
    }

    private void send(int index, int size) {
        service.receiveChunk(session.uploadId(), index, chunk(size, (byte) 'x'));
    }

    private MockMultipartFile chunk(int size, byte content) {
        byte[] bytes = new byte[size];
        Arrays.fill(bytes, content);
        return new MockMultipartFile("chunk", bytes);
    }

    private Path part(int index) {
        return service.sessionDirectory(session.uploadId()).resolve(index + ".part");
    }
}