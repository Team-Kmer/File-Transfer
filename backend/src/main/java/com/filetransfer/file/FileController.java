package com.filetransfer.file;
import com.filetransfer.error.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService storageService;

    public FileController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping
    public List<FileResponse> listFiles() {
        return storageService.findAllMostRecentFirst().stream()
                .map(FileResponse::from)
                .toList();
    }

    @PostMapping("/upload")
    public ResponseEntity<FileResponse> upload(@RequestParam("file") MultipartFile file) {
        FileMetadata metadata = storageService.store(file);
        FileResponse response = FileResponse.from(metadata);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!storageService.delete(id)) {
            throw new ResourceNotFoundException("File not found: " + id);
        }
        return ResponseEntity.noContent().build();
    }
}
