package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Auto-suggestion result for laws and nodes")
public class SuggestionDTO {
    
    @Schema(description = "ID of the suggested item")
    private Long id;
    
    @Schema(description = "Type of suggestion (LAW or NODE)")
    private String type;
    
    @Schema(description = "Display text for the suggestion")
    private String text;
    
    @Schema(description = "Law code (if type is LAW)")
    private String code;
}