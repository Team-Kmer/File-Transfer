package com.filetransfer.rooms;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom() {
        Room room = roomService.create();
        RoomResponse response = RoomResponse.from(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{code}")
    public RoomResponse getRoom(@PathVariable String code) {
        Room room = roomService.getByCode(code);
        return RoomResponse.from(room);
    }

    @PostMapping("/{code}/join")
    public RoomResponse joinRoom(@PathVariable String code,
                          @Valid @RequestBody JoinRoomRequest request
    ) {
        Room room = roomService.joinRoom(code, request.deviceId(), request.name());
        return RoomResponse.from(room);
    }
}