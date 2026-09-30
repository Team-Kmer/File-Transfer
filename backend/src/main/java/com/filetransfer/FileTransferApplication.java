package com.filetransfer;

import org.springframework.boot.SpringApplication;
import com.filetransfer.file.StorageProperties;
import com.filetransfer.file.chunked.ChunkedUploadProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableConfigurationProperties({StorageProperties.class, ChunkedUploadProperties.class})
public class FileTransferApplication {

    public static void main(String[] args) {
        SpringApplication.run(FileTransferApplication.class, args);
    }

}
