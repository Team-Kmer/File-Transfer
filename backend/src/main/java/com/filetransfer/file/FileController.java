package com.filetransfer.file;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
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
}