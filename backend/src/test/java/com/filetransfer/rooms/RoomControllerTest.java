package com.filetransfer.rooms;

import com.filetransfer.error.InvalidRoomCodeException;
import com.filetransfer.error.RoomNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoomControllerTest {

    private static final Instant NOW = Instant.parse("2026-10-02T10:00:00Z");
    private static final Instant EXPIRES = NOW.plus(Duration.ofHours(24));

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @Test
    void get_returns_200_with_room_state() throws Exception {
        when(roomService.getByCode("123456")).thenReturn(room());

        mockMvc.perform(get("/api/rooms/123456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("123456"))
                .andExpect(jsonPath("$.devices").isEmpty());
    }

    @Test
    void get_returns_404_in_api_error_format_when_room_unknown() throws Exception {
        when(roomService.getByCode("999999"))
                .thenThrow(new RoomNotFoundException("Room not found: 999999"));

        mockMvc.perform(get("/api/rooms/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Room not found: 999999"))
                .andExpect(jsonPath("$.path").value("/api/rooms/999999"));
    }

    @Test
    void get_returns_400_when_code_malformed() throws Exception {
        when(roomService.getByCode("1234567")).thenThrow(new InvalidRoomCodeException("Invalid room code: 1234567"));
        mockMvc.perform(get("/api/rooms/1234567"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/rooms/1234567"))
                .andExpect(jsonPath("$.message").value("Invalid room code: 1234567"));
    }


    @Test
    void create_returns_201_with_code_and_dates() throws Exception {
        when(roomService.create()).thenReturn(room());

        mockMvc.perform(post("/api/rooms"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("123456"))
                .andExpect(jsonPath("$.createdAt").value("2026-10-02T10:00:00Z"))
                .andExpect(jsonPath("$.expiresAt").value("2026-10-03T10:00:00Z"));
    }

    @Test
    void join_returns_404_when_room_unknown() throws Exception {
        when(roomService.joinRoom("999999", "device-1", "Phone"))
                .thenThrow(new RoomNotFoundException("Room not found: 999999"));

        mockMvc.perform(post("/api/rooms/999999/join").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deviceId": "device-1", "name": "Phone"}
                            """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Room not found: 999999"));
    }

    @Test
    void join_returns_400_when_body_missing() throws Exception {
        mockMvc.perform(post("/api/rooms/123456/join"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
    }

    @Test
    void join_returns_400_when_deviceId_is_blank() throws Exception {
        mockMvc.perform(post("/api/rooms/123456/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                    {"deviceId": "", "name": "Phone"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("deviceId: must not be blank"));

        verify(roomService, never()).joinRoom(anyString(), anyString(), anyString());
    }

    @Test
    void join_returns_200_with_device_in_room() throws Exception {
        Room room = room();
        room.addDevice(new Device("device-1", "Phone", NOW));
        when(roomService.joinRoom("123456", "device-1", "Phone")).thenReturn(room);

        mockMvc.perform(post("/api/rooms/123456/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"deviceId": "device-1", "name": "Phone"}
                            """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.devices[0].deviceId").value("device-1"))
                .andExpect(jsonPath("$.devices[0].name").value("Phone"));
    }

    private Room room() {
        return new Room(NOW, EXPIRES, "123456");
    }

}
