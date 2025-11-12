package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@Schema(description = "LLM-based legal analysis result with citations")
public class QaAnalyzeResponse {
    @Schema(description = "Decision: VIOLATION | NO_VIOLATION | UNCERTAIN")
    private String decision;

    @Schema(description = "Short explanation")
    private String explanation;

    @Schema(description = "Citations matched from context")
    private List<Citation> citations;

    @Schema(description = "Effective date used for analysis")
    private LocalDate effectiveAt;

    @Data
    @Builder
    public static class Citation {
        private String lawCode;
        private String nodePath;
        private Long nodeId;
    }
}

