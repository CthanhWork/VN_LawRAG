package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Search result item for law nodes with highlight snippet")
public class NodeSearchDTO {
    @Schema(description = "Node ID")
    private Long id;

    @Schema(description = "Law ID this node belongs to")
    private Long lawId;

    @Schema(description = "Level (e.g., DIEU/KHOAN)")
    private String level;

    @Schema(description = "Ordinal label (e.g., 'Điều 5', 'Khoản 1')")
    private String ordinalLabel;

    @Schema(description = "Heading/title of the node")
    private String heading;

    @Schema(description = "Highlighted snippet around the query term")
    private String snippet;
}

