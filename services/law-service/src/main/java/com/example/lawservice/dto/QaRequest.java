package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Request body for QA endpoint")
public class QaRequest {
    @Schema(description = "Câu hỏi")
    private String question;
}

