package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public class UpdateUserStatusRequest {
    @Schema(description = "Trang thai tai khoan (ACTIVE, PENDING, DISABLED)", example = "DISABLED")
    @NotBlank
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
