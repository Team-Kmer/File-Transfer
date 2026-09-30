package com.filetransfer.file.chunked;

import com.filetransfer.rooms.RoomService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChunkedUploadControllerTest {

    private static final String ROOM = "ABC123";
    private static final long FIVE_MB = 5L * 1024 * 1024;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @BeforeEach
    void setUp() {
        when(roomService.exists(ROOM)).thenReturn(true);
    }

    private String body(String filename, Object sizeBytes, String roomCode) {
        return """
                {"filename": "%s", "sizeBytes": %s, "mimeType": "video/mp4", "roomCode": "%s"}
                """.formatted(filename, sizeBytes, roomCode);
    }

    private MvcResult init(String json) throws Exception {
        return mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andReturn();
    }

    @Test
    void returns_201_with_upload_id_chunk_size_and_total_chunks() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", 2 * FIVE_MB + 1, ROOM)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.uploadId").exists())
                .andExpect(jsonPath("$.chunkSize").value(FIVE_MB))
                .andExpect(jsonPath("$.totalChunks").value(3));
    }

    @Test
    void returns_400_when_file_is_empty() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", 0, ROOM)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Uploaded file must not be empty"));
    }

    @Test
    void returns_400_when_size_is_negative() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", -1, ROOM)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("sizeBytes")));
    }

    @Test
    void returns_400_when_required_fields_are_missing() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("filename")))
                .andExpect(jsonPath("$.message", containsString("roomCode")))
                .andExpect(jsonPath("$.message", containsString("sizeBytes")));
    }

    @Test
    void returns_400_when_body_is_malformed() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"));
    }

    @Test
    void returns_404_when_room_is_unknown() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", 100, "UNKNOWN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Room not found: UNKNOWN"));
    }

    @Test
    void returns_413_when_file_exceeds_max_size() throws Exception {
        long twoGbPlusOne = 2L * 1024 * 1024 * 1024 + 1;

        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", twoGbPlusOne, ROOM)))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message").value("File exceeds the 2048MB limit"));
    }

    @Test
    void returns_415_when_file_type_is_refused() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("setup.exe", 100, ROOM)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.message").value("File type not allowed: setup.exe"));
    }

    @Test
    void returns_204_when_abort_succeeds() throws Exception {
        MvcResult result = init(body("video.mp4", 100, ROOM));
        String uploadId = JsonPath.read(
                result.getResponse().getContentAsString(), "$.uploadId");

        mockMvc.perform(delete("/api/files/upload/{uploadId}", uploadId))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/files/upload/{uploadId}", uploadId))
                .andExpect(status().isNotFound());
    }

    @Test
    void returns_404_when_abort_id_is_unknown() throws Exception {
        mockMvc.perform(delete("/api/files/upload/{uploadId}", UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("Upload session not found")));
    }

    @Test
    void returns_400_when_abort_id_is_not_a_uuid() throws Exception {
        mockMvc.perform(delete("/api/files/upload/{uploadId}", "not-a-uuid"))
                .andExpect(status().isBadRequest());
    }
}