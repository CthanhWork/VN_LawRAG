package com.example.lawservice.dto;

import lombok.Builder;
import lombok.Data;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Data
@Builder
@Schema(description = "Table of contents node for a law")
public class TocDTO {
    @Schema(description = "Node ID")
    private Long id;

    @Schema(description = "Display label (e.g., 'Điều 5', 'Khoản 1')")
    private String label;

    @Schema(description = "Level (e.g., PHAN/CHUONG/MUC/DIEU/KHOAN)")
    private String level;

    @Schema(description = "Child nodes")
    private List<TocDTO> children;
}
