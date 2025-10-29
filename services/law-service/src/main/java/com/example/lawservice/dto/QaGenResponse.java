package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@Schema(description = "LLM generation response with citations")
public class QaGenResponse {
    @Schema(description = "Generated answer from the LLM")
    private String answer;

    @Schema(description = "Citations to legal sources used in the answer")
    private List<Citation> citations;

    @Schema(description = "Timestamp for which this answer is effective")
    private LocalDate effectiveAt;

    @Schema(description = "IDs of nodes used in answer generation")
    private List<Long> usedNodes;

    @Data
    @Builder
    public static class Citation {
        private String lawCode;
        private String nodePath;
        private Long nodeId;
    }
}

