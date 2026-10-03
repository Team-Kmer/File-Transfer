package com.filetransfer.rooms;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Locale;

@Component
public class RoomCodeGenerator {
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        return String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
    }
}
