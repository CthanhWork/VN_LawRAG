package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Metadata for uploading a new law PDF")
public class LawUploadRequest {
    @NotBlank
    @Schema(description = "Law code (unique)", example = "121/VBHN-VPQH")
    private String code;

    @NotBlank
    @Schema(description = "Law title", example = "Van ban hop nhat 121/VBHN-VPQH")
    private String title;

    @Schema(description = "Document type", example = "LAW", defaultValue = "LAW")
    private String docType = "LAW";

    @Schema(description = "Issuing body", example = "Quoc hoi")
    private String issuingBody;

    @Schema(description = "Promulgation date", example = "2019-01-01")
    private LocalDate promulgationDate;

    @Schema(description = "Effective from date", example = "2019-01-01")
    private LocalDate effectiveDate;

    @Schema(description = "Expire date (if any)", example = "2026-12-31")
    private LocalDate expireDate;

    @Schema(description = "Related law id (for decrees/guidances)")
    private Long relatedLawId;

    @Schema(description = "Overwrite existing nodes if law code already exists", defaultValue = "false")
    private Boolean replaceExisting = false;

    @Schema(description = "Trigger RAG reindex after upload", defaultValue = "false")
    private Boolean triggerReindex = false;

    @Schema(description = "Effective start date applied to created nodes", example = "2019-01-01")
    private LocalDate nodeEffectiveStart;

    @Schema(description = "Effective end date applied to created nodes", example = "2099-12-31")
    private LocalDate nodeEffectiveEnd;
}
