package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Request body for generative QA endpoint")
public class QaGenRequest {
    private String question;
    private LocalDate effectiveAt;
    private Integer k;
    private Integer maxTokens;
    private Double temperature;
}

