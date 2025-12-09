package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Thong tin can cap nhat cua nguoi dung")
public class UpdateProfileRequest {
    @NotBlank
    @Size(min = 3, max = 50, message = "displayName 3-50 ky tu")
    @Schema(description = "Ten hien thi moi", example = "Nguyen Van A")
    private String displayName;

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}
