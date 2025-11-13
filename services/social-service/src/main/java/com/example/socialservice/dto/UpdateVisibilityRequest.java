package com.example.socialservice.dto;

import com.example.socialservice.enums.PostVisibility;
import io.swagger.v3.oas.annotations.media.Schema;

public class UpdateVisibilityRequest {
    @Schema(description = "Chế độ hiển thị", example = "PUBLIC", allowableValues = {"PUBLIC", "PRIVATE"})
    private PostVisibility visibility;

    public PostVisibility getVisibility() { return visibility; }
    public void setVisibility(PostVisibility visibility) { this.visibility = visibility; }
}

