package com.filetransfer.file.chunked;

import com.filetransfer.rooms.RoomService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChunkAssemblyFailureControllerTest {

    private static final String ROOM = "123456";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @MockitoBean
    private ChunkAssembler chunkAssembler;

    @Test
    void last_chunk_returns_500_when_assembly_fails() throws Exception {
        when(roomService.exists(ROOM)).thenReturn(true);
        when(chunkAssembler.assemble(any(), any())).thenThrow(new IllegalStateException("Disk full"));
        MvcResult init = mockMvc.perform(post("/api/files/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"filename": "video.mp4", "sizeBytes": 100, "mimeType": "video/mp4", "roomCode": "%s"}
                                """.formatted(ROOM)))
                .andReturn();
        String uploadId = JsonPath.read(init.getResponse().getContentAsString(), "$.uploadId");

        mockMvc.perform(put("/api/files/upload/{uploadId}/chunks/{index}", uploadId, 0)
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .content(new byte[100]))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500));

        mockMvc.perform(get("/api/files/upload/{uploadId}", uploadId))
                .andExpect(jsonPath("$.status").value("FAILED"));
    }
}