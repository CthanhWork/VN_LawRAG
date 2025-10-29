package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.Builder;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@Schema(description = "Response object for QA queries")
public class QaResponse {
    
    @Schema(description = "The answer generated from the RAG system")
    private String answer;
    
    @Schema(description = "List of relevant legal context passages")
    private List<LegalContext> context;
    
    @Schema(description = "The timestamp for which this answer is effective")
    private LocalDate effectiveAt;
    
    @Data
    @Builder
    public static class LegalContext {
        @Schema(description = "The text content from the law")
        private String content;
        
        @Schema(description = "The law code reference")
        private String lawCode;
        
        @Schema(description = "Path to the specific node in the law")
        private String nodePath;
        
        @Schema(description = "ID of the specific node, if available")
        private Long nodeId;
        
        @Schema(description = "When this law/node becomes effective")
        private LocalDate effectiveStart;
        
        @Schema(description = "When this law/node stops being effective")
        private LocalDate effectiveEnd;
    }
}
