package com.filetransfer.file.chunked;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Refuses executable and script files, identified by their extension.
 * The MIME type is declared by the client and cannot be trusted on its own.
 */
@Component
public class FileTypeValidator {

    private final Set<String> blockedExtensions;

    public FileTypeValidator(ChunkedUploadProperties properties) {
        this.blockedExtensions = properties.blockedExtensions().stream()
                .map(extension -> extension.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isAllowed(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return true;
        }
        String extension = filename.substring(lastDot + 1).toLowerCase(Locale.ROOT);
        return !blockedExtensions.contains(extension);
    }
}