package com.filetransfer.file.chunked;

import com.filetransfer.error.UploadSessionNotFoundException;
import com.filetransfer.file.FileMetadata;
import com.filetransfer.file.FileStorageService;
import com.filetransfer.file.StorageProperties;
import com.filetransfer.rooms.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChunkAssemblyTest {

    private static final String ROOM = "123456";
    private static final int CHUNK_SIZE = 4;

    @TempDir
    Path tempDir;

    private FileStorageService storageService;
    private ChunkedUploadService service;

    @BeforeEach
    void setUp() {
        ChunkedUploadProperties properties = new ChunkedUploadProperties(
                tempDir,
                DataSize.ofBytes(CHUNK_SIZE),
                DataSize.ofMegabytes(10),
                List.of("exe"));
        RoomService roomService = mock(RoomService.class);
        when(roomService.exists(ROOM)).thenReturn(true);
        storageService = new FileStorageService(new StorageProperties(tempDir));
        service = new ChunkedUploadService(
                properties, roomService, new FileTypeValidator(properties), new ChunkAssembler(storageService));
    }

    @Test
    void concatenatesInIndexOrderNotInArrivalOrder() throws IOException {
        UploadSession session = init("notes.txt", 10);
        writePart(session, 2, "ij");
        writePart(session, 0, "abcd");
        writePart(session, 1, "efgh");

        service.completeUpload(session);

        FileMetadata stored = singleStoredFile();
        assertThat(Files.readString(storedPath(stored))).isEqualTo("abcdefghij");
    }

    @Test
    void registersAssembledFileAsNormalStoredFile() throws IOException {
        UploadSession session = init("notes.txt", 10);
        writeParts(session, "abcd", "efgh", "ij");

        service.completeUpload(session);

        FileMetadata stored = singleStoredFile();
        assertThat(stored.originalName()).isEqualTo("notes.txt");
        assertThat(stored.size()).isEqualTo(10);
        assertThat(stored.mimeType()).isEqualTo("text/plain");
        assertThat(stored.storedFilename()).isEqualTo(stored.id() + ".txt");
        assertThat(storageService.getById(stored.id())).isEqualTo(stored);
        assertThat(storageService.loadAsResource(stored).getContentAsString(StandardCharsets.UTF_8))
                .isEqualTo("abcdefghij");

        storageService.delete(stored.id());
        assertThat(storageService.findAll()).isEmpty();
    }

    @Test
    void completesSessionRemovesItAndDeletesTemporaryDirectory() throws IOException {
        UploadSession session = init("notes.txt", 10);
        writeParts(session, "abcd", "efgh", "ij");

        service.completeUpload(session);

        assertThat(session.status()).isEqualTo(UploadStatus.COMPLETED);
        assertThatThrownBy(() -> service.getById(session.uploadId()))
                .isInstanceOf(UploadSessionNotFoundException.class);
        assertThat(service.sessionDirectory(session.uploadId())).doesNotExist();
    }

    @Test
    void missingPartFailsAndRegistersNothing() throws IOException {
        UploadSession session = init("notes.txt", 10);
        writePart(session, 0, "abcd");
        writePart(session, 2, "ij");

        service.completeUpload(session);

        assertFailedWithoutStoredFile(session);
    }

    @Test
    void wrongTotalSizeFailsAndRegistersNothing() throws IOException {
        UploadSession session = init("notes.txt", 10);
        writeParts(session, "abcd", "efgh", "ijk");

        service.completeUpload(session);

        assertFailedWithoutStoredFile(session);
    }

    @Test
    void assemblesExactlyOnceWhenTriggeredConcurrently() throws Exception {
        UploadSession session = init("notes.txt", 10);
        writeParts(session, "abcd", "efgh", "ij");

        int threads = 8;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<?>> results = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    service.completeUpload(session);
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> result : results) {
                result.get();
            }
        } finally {
            pool.shutdown();
        }

        assertThat(storageService.findAll()).hasSize(1);
        assertThat(session.status()).isEqualTo(UploadStatus.COMPLETED);
    }

    @Test
    void rebuilds200ShuffledChunksWithMatchingSha256() throws Exception {
        int totalChunks = 200;
        byte[] source = new byte[totalChunks * CHUNK_SIZE - 3];
        new Random(42).nextBytes(source);
        UploadSession session = init("video.mp4", source.length);
        assertThat(session.totalChunks()).isEqualTo(totalChunks);

        List<Integer> arrivalOrder = new ArrayList<>(IntStream.range(0, totalChunks).boxed().toList());
        Collections.shuffle(arrivalOrder, new Random(7));
        for (int index : arrivalOrder) {
            int from = index * CHUNK_SIZE;
            int to = Math.min(from + CHUNK_SIZE, source.length);
            Files.write(part(session, index), Arrays.copyOfRange(source, from, to));
        }

        service.completeUpload(session);

        assertThat(sha256(storedPath(singleStoredFile()))).isEqualTo(sha256(source));
    }

    private UploadSession init(String filename, long sizeBytes) {
        String mimeType = filename.endsWith(".txt") ? "text/plain" : "video/mp4";
        return service.init(new InitUploadRequest(filename, sizeBytes, mimeType, ROOM));
    }

    private void writeParts(UploadSession session, String... contents) throws IOException {
        for (int index = 0; index < contents.length; index++) {
            writePart(session, index, contents[index]);
        }
    }

    private void writePart(UploadSession session, int index, String content) throws IOException {
        Files.writeString(part(session, index), content);
    }

    private Path part(UploadSession session, int index) {
        return service.sessionDirectory(session.uploadId()).resolve(index + ".part");
    }

    private FileMetadata singleStoredFile() {
        assertThat(storageService.findAll()).hasSize(1);
        return storageService.findAll().getFirst();
    }

    private Path storedPath(FileMetadata metadata) {
        return tempDir.resolve(metadata.storedFilename());
    }

    private void assertFailedWithoutStoredFile(UploadSession session) throws IOException {
        assertThat(session.status()).isEqualTo(UploadStatus.FAILED);
        assertThat(storageService.findAll()).isEmpty();
        try (var entries = Files.list(tempDir)) {
            assertThat(entries.filter(Files::isRegularFile)).isEmpty();
        }
    }

    private static String sha256(byte[] content) throws NoSuchAlgorithmException {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }

    private static String sha256(Path file) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new DigestInputStream(Files.newInputStream(file), digest)) {
            input.transferTo(OutputStream.nullOutputStream());
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}