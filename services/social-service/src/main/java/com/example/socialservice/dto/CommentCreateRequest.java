package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public class CommentCreateRequest {
    @Schema(description = "Nội dung bình luận", example = "Ý kiến của mình...")
    private String content;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}

