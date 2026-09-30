package com.filetransfer.file.chunked;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChunkCalculatorTest {

    private static final long FIVE_MB = 5L * 1024 * 1024;

    @Test
    void returnsExactCountWhenSizeIsMultipleOfChunkSize() {
        assertThat(ChunkCalculator.totalChunks(2 * FIVE_MB, FIVE_MB)).isEqualTo(2);
    }

    @Test
    void addsOneChunkForTheRemainder() {
        assertThat(ChunkCalculator.totalChunks(2 * FIVE_MB + 1, FIVE_MB)).isEqualTo(3);
    }

    @Test
    void returnsSingleChunkWhenFileIsSmallerThanChunkSize() {
        assertThat(ChunkCalculator.totalChunks(1, FIVE_MB)).isEqualTo(1);
    }

    @Test
    void returnsSingleChunkWhenFileEqualsChunkSize() {
        assertThat(ChunkCalculator.totalChunks(FIVE_MB, FIVE_MB)).isEqualTo(1);
    }

    @Test
    void handlesTwoGigabyteFileWithoutOverflow() {
        long twoGb = 2L * 1024 * 1024 * 1024;

        assertThat(ChunkCalculator.totalChunks(twoGb, FIVE_MB)).isEqualTo(410);
    }

    @Test
    void rejectsZeroSize() {
        assertThatThrownBy(() -> ChunkCalculator.totalChunks(0, FIVE_MB))
                .isInstanceOf(IllegalArgumentException.class);
    }
}