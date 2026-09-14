package com.filetransfer.webConfigTest;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.cors.allowed-origins[0]=http://localhost:4200",
        "app.cors.allowed-origins[1]=http://192.168.1.10:4200"
})
@AutoConfigureMockMvc
class WebConfigTest {

    private static final String LOCALHOST_ORIGIN = "http://localhost:4200";
    private static final String LAN_ORIGIN = "http://192.168.1.10:4200";
    private static final String UNKNOWN_ORIGIN = "http://192.168.1.99:4200";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void allowsLocalhostOrigin() throws Exception {
        mockMvc.perform(preflightRequest(LOCALHOST_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, LOCALHOST_ORIGIN));
    }

    @Test
    void allowsConfiguredLanOrigin() throws Exception {
        mockMvc.perform(preflightRequest(LAN_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, LAN_ORIGIN));
    }

    @Test
    void rejectsUnknownOrigin() throws Exception {
        mockMvc.perform(preflightRequest(UNKNOWN_ORIGIN))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    private MockHttpServletRequestBuilder preflightRequest(String origin) {
        return options("/api/files").header(HttpHeaders.ORIGIN, origin)
                      .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.GET.name());
    }
}