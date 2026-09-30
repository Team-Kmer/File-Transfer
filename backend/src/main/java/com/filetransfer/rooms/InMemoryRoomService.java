package com.filetransfer.rooms;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Temporary in-memory implementation until the rooms ticket delivers the real service.
 */
@Service
public class InMemoryRoomService implements RoomService {

    private final Set<String> roomCodes = ConcurrentHashMap.newKeySet();

    public void register(String roomCode) {
        roomCodes.add(roomCode);
    }

    @Override
    public boolean exists(String roomCode) {
        return roomCode != null && roomCodes.contains(roomCode);
    }
}