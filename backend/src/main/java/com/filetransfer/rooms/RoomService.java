package com.filetransfer.rooms;

import com.filetransfer.error.InvalidRoomCodeException;
import com.filetransfer.error.RoomNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class RoomService {
    private static final Pattern CODE_PATTERN = Pattern.compile("[0-9]{6}");

    private final Map<String, Room> roomsByCode = new ConcurrentHashMap<>();
    private final RoomCodeGenerator codeGenerator;
    private final Clock clock;
    private final Duration ttl;

    public RoomService(RoomCodeGenerator codeGenerator, Clock clock, RoomProperties properties) {
        this.codeGenerator = codeGenerator;
        this.clock = clock;
        this.ttl = properties.ttl();
    }

    Room create() {
        Instant now = clock.instant();
        removeExpiredRooms(now);

        while (true) {
            String code = codeGenerator.generate();
            Room room = new Room(now, now.plus(ttl), code);
            if (roomsByCode.putIfAbsent(code, room) == null) {
                return room;
            }
        }
    }

    public Room getByCode(String code) {
        validateCode(code);
        Room room = roomsByCode.get(code);
        if (!isActiveRoom(room)) {
            throw new RoomNotFoundException("Room not found: " + code);
        }
        return room;
    }

    public Room joinRoom(String code, String deviceId, String name) {
        Room room = getByCode(code);
        Device newDevice = new Device(deviceId, name, clock.instant());
        room.addDevice(newDevice);
        return room;
    }

    public boolean exists(String code) {
        validateCode(code);
        return isActiveRoom(roomsByCode.get(code));
    }

    private void validateCode(String code) {
        if (code == null || !CODE_PATTERN.matcher(code).matches()) {
            throw new InvalidRoomCodeException("Invalid room code: '" + code + "' must be exactly 6 digits");
        }
    }

    private boolean isActiveRoom(Room room) {
        return room != null && !room.isExpiredAt(clock.instant());
    }

    private void removeExpiredRooms(Instant now) {
        roomsByCode.forEach((code, room) -> {
            if (room.isExpiredAt(now)) {
                roomsByCode.remove(code, room);
            }
        });
    }
}
