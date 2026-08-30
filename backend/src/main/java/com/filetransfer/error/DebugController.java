package com.filetransfer.error;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @GetMapping("/not-found")
    public void notFound() {
        throw new ResourceNotFoundException("File abc-123 not found");
    }

    @GetMapping("/boom")
    public void boom() {
        throw new IllegalStateException("Simulated failure");
    }
}