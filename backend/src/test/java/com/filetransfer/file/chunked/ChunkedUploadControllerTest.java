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
import org.springframework.test.web.servlet.ResultActions;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

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

    private static final String ROOM = "123456";
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
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
    }

    @Test
    void returns_404_when_room_is_unknown() throws Exception {
        mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("video.mp4", 100, "999999")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Room not found: 999999"));
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
                .andExpect(status().isConflict());
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
    private String initUpload(long sizeBytes) throws Exception {
        MvcResult result = init(body("video.mp4", sizeBytes, ROOM));
        return JsonPath.read(result.getResponse().getContentAsString(), "$.uploadId");
    }

    private ResultActions sendChunk(String uploadId, Object index, int size) throws Exception {
        return mockMvc.perform(put("/api/files/upload/{uploadId}/chunks/{index}", uploadId, index)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .content(new byte[size]));
    }

    @Test
    void put_chunk_returns_200_with_progress() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);

        sendChunk(uploadId, 1, 10)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadId").value(uploadId))
                .andExpect(jsonPath("$.index").value(1))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.receivedChunks").value(1))
                .andExpect(jsonPath("$.totalChunks").value(2))
                .andExpect(jsonPath("$.fileId").doesNotExist());
    }

    @Test
    void put_last_chunk_completes_upload() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);
        sendChunk(uploadId, 1, 10).andExpect(status().isOk());

        sendChunk(uploadId, 0, (int) FIVE_MB)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.receivedChunks").value(2));
    }

    @Test
    void put_duplicate_chunk_returns_200_and_is_counted_once() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);
        sendChunk(uploadId, 1, 10).andExpect(status().isOk());

        sendChunk(uploadId, 1, 10)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receivedChunks").value(1));
    }

    @Test
    void put_returns_400_when_index_is_out_of_range() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);

        sendChunk(uploadId, 2, 10)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("out of range")));
    }

    @Test
    void put_returns_400_when_chunk_is_too_small() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);

        sendChunk(uploadId, 1, 9)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("wrong size")));
    }

    @Test
    void put_returns_400_when_chunk_is_too_large() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);

        sendChunk(uploadId, 1, 11)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("too large")));
    }

    @Test
    void put_returns_400_when_index_is_not_a_number() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);

        sendChunk(uploadId, "abc", 10)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value 'abc' for parameter 'index'"));
    }

    @Test
    void put_returns_404_when_upload_is_unknown() throws Exception {
        sendChunk(UUID.randomUUID().toString(), 0, 10)
                .andExpect(status().isNotFound());
    }

    @Test
    void put_returns_409_when_upload_is_aborted() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);
        mockMvc.perform(delete("/api/files/upload/{uploadId}", uploadId))
                .andExpect(status().isNoContent());

        sendChunk(uploadId, 1, 10)
                .andExpect(status().isConflict());
    }

    @Test
    void put_returns_409_when_upload_is_completed() throws Exception {
        String uploadId = initUpload(100);
        sendChunk(uploadId, 0, 100)
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        sendChunk(uploadId, 0, 100)
                .andExpect(status().isConflict());
    }

    @Test
    void get_status_returns_received_indexes() throws Exception {
        String uploadId = initUpload(FIVE_MB + 10);
        sendChunk(uploadId, 1, 10).andExpect(status().isOk());

        mockMvc.perform(get("/api/files/upload/{uploadId}", uploadId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadId").value(uploadId))
                .andExpect(jsonPath("$.filename").value("video.mp4"))
                .andExpect(jsonPath("$.sizeBytes").value(FIVE_MB + 10))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.chunkSize").value(FIVE_MB))
                .andExpect(jsonPath("$.totalChunks").value(2))
                .andExpect(jsonPath("$.receivedIndexes").value(contains(1)))
                .andExpect(jsonPath("$.fileId").doesNotExist());
    }

    @Test
    void get_status_returns_404_when_upload_is_unknown() throws Exception {
        mockMvc.perform(get("/api/files/upload/{uploadId}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }
}