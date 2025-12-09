package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
@Schema(description = "Law node detail DTO")
public class NodeDTO {
    @Schema(description = "Node ID")
    private Long id;

    @Schema(description = "Law ID")
    private Long lawId;

    @Schema(description = "Parent node ID (nullable)")
    private Long parentId;

    @Schema(description = "Level (PHAN/CHUONG/MUC/TIEU_MUC/DIEU/KHOAN/DIEM)")
    private String level;

    @Schema(description = "Ordinal label (e.g., 'Điều 5', 'Khoản 1')")
    private String ordinalLabel;

    @Schema(description = "Heading/title of node")
    private String heading;

    @Schema(description = "Plain text content")
    private String contentText;

    @Schema(description = "HTML content")
    private String contentHtml;

    @Schema(description = "Sort key for ordering")
    private String sortKey;

    @Schema(description = "Path-like identifier")
    private String path;

    @Schema(description = "Title for node")
    private String title;

    @Schema(description = "Effective start date")
    private LocalDate effectiveStart;

    @Schema(description = "Effective end date")
    private LocalDate effectiveEnd;
}

