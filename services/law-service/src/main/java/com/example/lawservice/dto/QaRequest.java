package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Request body for QA endpoint")
public class QaRequest {
    @Schema(
        description = "Câu hỏi",
        example = "Chị L cản trở tôi thăm nom con sau ly hôn, tôi phải làm gì?"
    )
    private String question;
}

