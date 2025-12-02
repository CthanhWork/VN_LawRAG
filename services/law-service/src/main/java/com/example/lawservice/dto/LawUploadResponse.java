package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
@Schema(description = "Result of uploading a law PDF")
public class LawUploadResponse {
    @Schema(description = "ID of the law record")
    Long lawId;

    @Schema(description = "Law code")
    String lawCode;

    @Schema(description = "Law title")
    String title;

    @Schema(description = "ID of the created root node containing extracted text")
    Long nodeId;

    @Schema(description = "Absolute path of the stored PDF on server")
    String storedFile;

    @Schema(description = "Number of characters extracted from PDF")
    Integer extractedChars;

    @Schema(description = "Whether a new law row was created (vs. updated)")
    Boolean created;

    @Schema(description = "Whether RAG reindex was triggered")
    Boolean reindexed;
}
