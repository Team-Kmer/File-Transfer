package com.filetransfer.file.chunked;

import com.filetransfer.file.FileMetadata;
import com.filetransfer.file.FileStorageService;
import com.filetransfer.file.StorageProperties;
import com.filetransfer.rooms.RoomService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Proves that assembly is streamed: a 500 MB file is rebuilt with a 64 MB heap.
 * Skipped by default because it writes about 1 GB to disk. Run it with:
 * ./mvnw test -Dtest=ChunkAssemblyLargeFileTest -DlargeTests=true -DargLine=-Xmx64m
 */
@EnabledIfSystemProperty(named = "largeTests", matches = "true")
class ChunkAssemblyLargeFileTest {

    private static final String ROOM = "123456";
    private static final int CHUNK_SIZE = 5 * 1024 * 1024;
    private static final int TOTAL_CHUNKS = 100;
    private static final long FILE_SIZE = (long) CHUNK_SIZE * TOTAL_CHUNKS;

    @TempDir
    Path tempDir;

    @Test
    void assembles500MegabyteFileWithoutLoadingItIntoMemory() throws Exception {
        assertThat(Runtime.getRuntime().maxMemory())
                .as("Run with -DargLine=-Xmx64m so the heap is far smaller than the file")
                .isLessThan(FILE_SIZE / 4);

        ChunkedUploadProperties properties = new ChunkedUploadProperties(
                tempDir, DataSize.ofBytes(CHUNK_SIZE), DataSize.ofGigabytes(2), List.of("exe"));
        RoomService roomService = mock(RoomService.class);
        when(roomService.exists(ROOM)).thenReturn(true);
        FileStorageService storageService = new FileStorageService(new StorageProperties(tempDir));
        ChunkedUploadService service = new ChunkedUploadService(
                properties, roomService, new FileTypeValidator(properties), new ChunkAssembler(storageService));
        UploadSession session = service.init(
                new InitUploadRequest("large.bin", FILE_SIZE, "application/octet-stream", ROOM));

        MessageDigest sourceDigest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[CHUNK_SIZE];
        Random random = new Random(42);
        for (int index = 0; index < TOTAL_CHUNKS; index++) {
            random.nextBytes(buffer);
            sourceDigest.update(buffer);
            Files.write(service.sessionDirectory(session.uploadId()).resolve(index + ".part"), buffer);
        }

        service.completeUpload(session);

        assertThat(session.status()).isEqualTo(UploadStatus.COMPLETED);
        FileMetadata stored = storageService.findAll().getFirst();
        assertThat(stored.size()).isEqualTo(FILE_SIZE);

        MessageDigest storedDigest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new DigestInputStream(
                Files.newInputStream(tempDir.resolve(stored.storedFilename())), storedDigest)) {
            input.transferTo(OutputStream.nullOutputStream());
        }
        assertThat(HexFormat.of().formatHex(storedDigest.digest()))
                .isEqualTo(HexFormat.of().formatHex(sourceDigest.digest()));
    }
}