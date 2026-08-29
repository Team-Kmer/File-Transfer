package com.filetransfer.file;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    private FileStorageService service;
    private Path storageDirectory;

    @BeforeEach
    void setUp() {
        storageDirectory = tempDir.resolve("uploads");
        service = new FileStorageService(new StorageProperties(storageDirectory));
        service.initializeStorageDirectory();
    }

    @Test
    void shouldStoreFileOnDiskAndReturnMetadata() throws IOException {
        MockMultipartFile uploadedFile = new MockMultipartFile(
                "file", "rapport.pdf", "application/pdf",
                "Hello File Storage".getBytes(StandardCharsets.UTF_8));

        FileMetadata metadata = service.store(uploadedFile);
        Path storedFile = storageDirectory.resolve(metadata.storedFilename());

        assertThat(metadata.id()).isNotNull();
        assertThat(metadata.uploadDate()).isNotNull();
        assertThat(metadata.originalName()).isEqualTo("rapport.pdf");
        assertThat(metadata.mimeType()).isEqualTo("application/pdf");
        assertThat(metadata.size()).isEqualTo(uploadedFile.getSize());
        assertThat(metadata.storedFilename()).isEqualTo(metadata.id() + ".pdf");
        assertThat(storedFile).exists();
        assertThat(Files.readString(storedFile)).isEqualTo("Hello File Storage");
        assertThat(storageDirectory.resolve("rapport.pdf")).doesNotExist();
    }

    @Test
    void shouldFindStoredFileById() {
        FileMetadata stored = service.store(textFile("notes.txt", "content"));

        assertThat(service.findById(stored.id())).contains(stored);
    }

    @Test
    void shouldReturnEmptyWhenIdDoesNotExist() {
        assertThat(service.findById(UUID.randomUUID())).isEmpty();
    }

    @Test
    void shouldReturnEmptyListWhenNoFilesStored() {
        assertThat(service.findAll()).isEmpty();
    }

    @Test
    void shouldReturnAllStoredFiles() {
        FileMetadata first = service.store(textFile("a.txt", "first"));
        FileMetadata second = service.store(textFile("b.txt", "second"));

        assertThat(service.findAll()).containsExactlyInAnyOrder(first, second);
    }

    @Test
    void shouldDeleteFileAndMetadataAndReturnTrue() {
        FileMetadata metadata = service.store(textFile("notes.txt", "my notes"));
        Path storedFile = storageDirectory.resolve(metadata.storedFilename());
        assertThat(storedFile).exists();

        boolean deleted = service.delete(metadata.id());

        assertThat(deleted).isTrue();
        assertThat(storedFile).doesNotExist();
        assertThat(service.findById(metadata.id())).isEmpty();
    }

    @Test
    void shouldReturnFalseWhenDeletingUnknownId() {
        assertThat(service.delete(UUID.randomUUID())).isFalse();
    }

    @Test
    void shouldRejectEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.txt", "text/plain", new byte[0]);

        assertThatThrownBy(() -> service.store(emptyFile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Uploaded file must not be empty");

        assertThat(service.findAll()).isEmpty();
    }

    private MockMultipartFile textFile(String name, String content) {
        return new MockMultipartFile(
                "file", name, "text/plain", content.getBytes(StandardCharsets.UTF_8));
    }
}