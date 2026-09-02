package com.filetransfer.file;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileStorageService storageService;

    @Test
    void returns_200_and_empty_array_when_no_files() throws Exception {
        when(storageService.findAllMostRecentFirst()).thenReturn(List.of());

        mockMvc.perform(get("/api/files"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void returns_files_sorted_by_uploadedAt_descending() throws Exception {
        FileMetadata older = new FileMetadata(
                UUID.randomUUID(), "new.pdf", 20L,
                Instant.parse("2026-01-01T10:00:00Z"), "application/pdf", "uuid2.pdf");
        FileMetadata newer = new FileMetadata(
                UUID.randomUUID(), "old.txt", 10L,
                Instant.parse("2026-06-01T10:00:00Z"), "text/plain", "uuid1.txt");
        when(storageService.findAllMostRecentFirst()).thenReturn(List.of(older, newer));

        mockMvc.perform(get("/api/files"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("new.pdf"))
                .andExpect(jsonPath("$[0].sizeBytes").value(20))
                .andExpect(jsonPath("$[0].mimeType").value("application/pdf"))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].uploadedAt").exists())
                .andExpect(jsonPath("$[1].name").value("old.txt"));
    }

    @Test
    void returns_201_and_metadata_when_upload_succeeds() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "hello.txt", "text/plain", "Hello".getBytes());

        UUID id = UUID.randomUUID();
        FileMetadata stored = new FileMetadata(
                id,
                "hello.txt",
                5L,
                Instant.parse("2026-06-01T10:00:00Z"),
                "text/plain", "uuid.txt");

        when(storageService.store(any(MultipartFile.class))).thenReturn(stored);

        mockMvc.perform(multipart("/api/files/upload").file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("hello.txt"))
                .andExpect(jsonPath("$.sizeBytes").value(5))
                .andExpect(jsonPath("$.mimeType").value("text/plain"))
                .andExpect(jsonPath("$.uploadedAt").exists());
    }

    @Test
    void returns_400_when_file_is_empty() throws Exception {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "empty.txt", "text/plain", new byte[0]);

        when(storageService.store(any(MultipartFile.class)))
                .thenThrow(new IllegalArgumentException("Uploaded file must not be empty"));

        mockMvc.perform(multipart("/api/files/upload").file(empty))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Uploaded file must not be empty"));
    }

    @Test
    void returns_413_when_file_exceeds_max_size() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
        "big.bin",
           "application/octet-stream", "any".getBytes()
        );

        when(storageService.store(any(MultipartFile.class)))
                .thenThrow(new MaxUploadSizeExceededException(10 * 1024 * 1024));

        mockMvc.perform(multipart("/api/files/upload").file(file))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.message").value("File exceeds the 10MB limit"));
    }
}