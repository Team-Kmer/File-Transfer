package com.filetransfer.file;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
}
