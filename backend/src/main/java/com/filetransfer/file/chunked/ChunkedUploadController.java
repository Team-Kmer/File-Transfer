package com.filetransfer.file.chunked;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/files/upload")
public class ChunkedUploadController {

    private final ChunkedUploadService uploadService;

    public ChunkedUploadController(ChunkedUploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping("/init")
    public ResponseEntity<InitUploadResponse> init(@Valid @RequestBody InitUploadRequest request) {
        UploadSession session = uploadService.init(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(InitUploadResponse.from(session));
    }

    @DeleteMapping("/{uploadId}")
    public ResponseEntity<Void> abort(@PathVariable UUID uploadId) {
        uploadService.abort(uploadId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/chunk")
    public ResponseEntity<UploadStatusResponse> receiveChunk(
            @RequestParam UUID uploadId,
            @RequestParam int index,
            @RequestParam MultipartFile chunk
    ) {
        uploadService.receiveChunk(uploadId, index, chunk);
        return ResponseEntity.ok(UploadStatusResponse.from(uploadService.getById(uploadId)));
    }

    @GetMapping("/{uploadId}")
    public ResponseEntity<UploadStatusResponse> status(@PathVariable UUID uploadId) {
        return ResponseEntity.ok(UploadStatusResponse.from(uploadService.getById(uploadId)));
    }
}