package com.example.lawservice.controller;

import com.example.lawservice.dto.QaResponse;
import com.example.lawservice.clients.RagClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QAController.class)
public class QAControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RagClient ragClient;

    @Test
    void ask_ShouldReturnQaResponse() throws Exception {
        // Given
        String question = "What is the tax rate?";
        LocalDate now = LocalDate.now();
        
        QaResponse mockResponse = QaResponse.builder()
            .answer("The tax rate is 20%")
            .context(Collections.emptyList())
            .effectiveAt(now)
            .build();

        when(ragClient.ask(any(), any())).thenReturn(mockResponse);

        // When & Then
        mockMvc.perform(post("/api/qa")
                .content(question)
                .contentType(MediaType.TEXT_PLAIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("The tax rate is 20%"))
                .andExpect(jsonPath("$.context").isArray());
    }
}
