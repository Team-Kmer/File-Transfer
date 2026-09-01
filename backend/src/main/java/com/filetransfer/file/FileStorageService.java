package com.filetransfer.file;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FileStorageService {

    private final Path storagePath;
    private final Map<UUID, FileMetadata> metadataById = new ConcurrentHashMap<>();

    public FileStorageService(StorageProperties properties) {
        this.storagePath = properties.path();
    }

    @PostConstruct
    void initializeStorageDirectory() {
        try {
            Files.createDirectories(storagePath);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Could not create storage directory: " + storagePath, exception);
        }
    }

    public FileMetadata store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file must not be empty");
        }

        String originalName = resolveOriginalName(file);
        UUID id = UUID.randomUUID();
        String storedFilename = id + extractExtension(originalName);
        Path targetPath = storagePath.resolve(storedFilename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store file: " + originalName, exception);
        }

        FileMetadata metadata = new FileMetadata(
                id,
                originalName,
                file.getSize(),
                Instant.now(),
                file.getContentType(),
                storedFilename);

        metadataById.put(id, metadata);
        return metadata;
    }

    public Optional<FileMetadata> findById(UUID id) {
        return Optional.ofNullable(metadataById.get(id));
    }

    public List<FileMetadata> findAll() {
        return List.copyOf(metadataById.values());
    }

    public List<FileMetadata> findAllMostRecentFirst() {
        return findAll().stream()
                .sorted(Comparator.comparing(FileMetadata::uploadDate).reversed())
                .toList();
    }

    public boolean delete(UUID id) {
        FileMetadata metadata = metadataById.remove(id);
        if (metadata == null) {
            return false;
        }
        try {
            Files.deleteIfExists(storagePath.resolve(metadata.storedFilename()));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete file: " + id, exception);
        }
        return true;
    }

    private String resolveOriginalName(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            return "file";
        }
        return Path.of(originalName).getFileName().toString();
    }

    private String extractExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot);
    }
}