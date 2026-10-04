package com.filetransfer.rooms;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

class RoomCodeGeneratorTest {

    private final RoomCodeGenerator generator = new RoomCodeGenerator();

    @Test
    void generates_exactly_six_digits() {
        for (int i = 0; i < 10_000; i++) {
            String code = generator.generate();
            assertTrue(code.matches("[0-9]{6}"), "Invalid code: " + code);
        }
    }

    @Test
    void generates_different_codes() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 10_000; i++) {
            codes.add(generator.generate());
        }
        assertTrue(codes.size() > 1);
    }

    @Test
    void can_generate_codes_starting_with_zero(){
        boolean foundLeadingZero = false;
        for (int i = 0; i < 10_000; i++) {
            String code = generator.generate();
            if (code.startsWith("0")) {
                foundLeadingZero = true;
            }
        }
        assertTrue(foundLeadingZero);
    }
}