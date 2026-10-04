package com.filetransfer.rooms;

import com.filetransfer.error.InvalidRoomCodeException;
import com.filetransfer.error.RoomNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Iterator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;


class RoomServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-02T10:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    private static RoomCodeGenerator generatorReturning(String... codes) {
        Iterator<String> iterator = List.of(codes).iterator();

        return new RoomCodeGenerator() {
            @Override
            public String generate() {
                return iterator.next();
            }
        };
    }

    @Test
    void create_sets_createdAt_now_and_expiresAt_from_ttl() {
        RoomService roomService = serviceWith(generatorReturning("123456"));
        Room room = roomService.create();

        assertEquals("123456", room.getCode());
        assertEquals(NOW, room.getCreatedAt());
        assertEquals(NOW.plus(Duration.ofHours(24)), room.getExpiresAt());
    }

    @Test
    void create_retries_when_code_is_already_used() {
        RoomService service = serviceWith(generatorReturning("111111", "111111", "222222"));

        Room room = service.create();
        Room room2 = service.create();

        assertEquals("111111", room.getCode());
        assertEquals("222222", room2.getCode());
    }

    @Test
    void getByCode_throws_for_unknown_code() {
        RoomService service = serviceWith(generatorReturning("123456"));
        assertThrows(RoomNotFoundException.class, () -> service.getByCode("999999"));
    }

    @Test
    void getByCode_throws_for_expired_room() {
        RoomService service = expiredServiceWith(generatorReturning("123456"));
        service.create();

        assertThrows(RoomNotFoundException.class, () -> service.getByCode("123456"));
    }

    @Test
    void join_adds_device_to_room() {
        RoomService service = serviceWith(generatorReturning("123456"));
        Room room = service.create();
        Device device = new Device("device-1", "device", NOW);
        service.joinRoom(room.getCode(), device.deviceId(), device.name());

        assertTrue(room.getDevices().contains(device));
    }

    @Test
    void join_twice_with_same_deviceId_keeps_one_device(){
        RoomService service = serviceWith(generatorReturning("123456"));
        Room room = service.create();
        Device device = new Device("device-1", "device", NOW);
        service.joinRoom(room.getCode(), device.deviceId(), device.name());
        service.joinRoom(room.getCode(), device.deviceId(), device.name());

        assertEquals(1, room.getDevices().size());
    }

    @Test
    void join_unknown_room_throws(){
        RoomService service = serviceWith(generatorReturning("123456"));
        assertThrows(RoomNotFoundException.class, () -> service.joinRoom("999999", "device-1", "device"));
    }

    @Test
    void exists_is_true_for_active_and_false_for_unknown_or_expired(){
        RoomService service = serviceWith(generatorReturning("123456"));
        Room room = service.create();
        assertTrue(service.exists(room.getCode()));
        assertFalse(service.exists("999999"));
        RoomService expiredService = expiredServiceWith(generatorReturning("123456"));
        expiredService.create();
        assertFalse(expiredService.exists("123456"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "12345", "1234567", "12a456", ""})
    void getByCode_throws_for_malformed_code(String code) {
        RoomService service = serviceWith(generatorReturning("123456"));

        assertThrows(InvalidRoomCodeException.class, () -> service.getByCode(code));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "12345", "1234567", "12a456", ""})
    void exists_throws_for_malformed_code(String code){
        RoomService service = serviceWith(generatorReturning("123456"));
        assertThrows(InvalidRoomCodeException.class, () -> service.exists(code));
    }

    @Test
    void create_reuses_code_of_expired_room() {
        RoomService service = expiredServiceWith(generatorReturning("111111", "111111"));

        service.create();
        Room room2 = service.create();

        assertEquals("111111", room2.getCode());
    }

    private RoomService serviceWith(RoomCodeGenerator generator) {
        return new RoomService(generator, clock, new RoomProperties(Duration.ofHours(24)));
    }

    private RoomService expiredServiceWith(RoomCodeGenerator generator) {
        return new RoomService(generator, clock, new RoomProperties(Duration.ZERO));
    }
}
