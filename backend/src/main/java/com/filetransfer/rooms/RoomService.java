package com.filetransfer.rooms;

/**
 * Minimal contract used by other features to check that a room exists.
 * The full room lifecycle (creation, joining, expiry) comes later with the rooms ticket.
 */
public interface RoomService {

    boolean exists(String roomCode);
}