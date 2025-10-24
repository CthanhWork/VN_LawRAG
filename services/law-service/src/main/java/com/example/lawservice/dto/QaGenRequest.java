package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "Request body for generative QA endpoint")
public class QaGenRequest {
    private String question;
    private LocalDateTime effectiveAt;
    private Integer k;
    private Integer maxTokens;
    private Double temperature;
}

