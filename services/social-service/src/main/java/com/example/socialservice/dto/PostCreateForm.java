package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.multipart.MultipartFile;

@Schema(name = "PostCreateForm", description = "Form dữ liệu tạo bài viết (multipart/form-data)")
public class PostCreateForm {
    @Schema(description = "Nội dung bài viết", example = "Chào mọi người!")
    private String content;

    @ArraySchema(arraySchema = @Schema(description = "Danh sách file tải lên"),
            schema = @Schema(type = "string", format = "binary"))
    private MultipartFile[] files;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public MultipartFile[] getFiles() { return files; }
    public void setFiles(MultipartFile[] files) { this.files = files; }
}

