package com.filetransfer.file.chunked;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;

import java.nio.file.Path;
import java.util.List;

@ConfigurationProperties(prefix = "app.storage")
public record ChunkedUploadProperties(
        Path path,
        @DefaultValue("5MB") DataSize chunkSize,
        @DefaultValue("2GB") DataSize maxFileSize,
        @DefaultValue({"exe", "msi", "bat", "cmd", "com", "scr", "pif", "ps1", "vbs", "jar", "sh", "dll"})
        List<String> blockedExtensions
) {
}