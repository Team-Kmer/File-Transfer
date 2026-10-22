package com.filetransfer.file.chunked;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

@Component
public class ChunkSizeStartupCheck {

    public ChunkSizeStartupCheck(ChunkedUploadProperties properties,
                                 @Value("${spring.servlet.multipart.max-file-size}") DataSize multipartMaxFileSize) {
        if (properties.chunkSize().toBytes() > multipartMaxFileSize.toBytes()) {
            throw new IllegalStateException(
                    "app.storage.chunk-size (" + properties.chunkSize()
                            + ") must not exceed spring.servlet.multipart.max-file-size ("
                            + multipartMaxFileSize + ")");
        }
    }
}