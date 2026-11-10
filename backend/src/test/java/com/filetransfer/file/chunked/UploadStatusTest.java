package com.filetransfer.file.chunked;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UploadStatusTest {

    @Test
    void assemblingIsShownAsInProgress() {
        assertThat(UploadStatus.ASSEMBLING.visibleStatus()).isEqualTo(UploadStatus.IN_PROGRESS);
        assertThat(UploadStatus.COMPLETED.visibleStatus()).isEqualTo(UploadStatus.COMPLETED);
    }
}