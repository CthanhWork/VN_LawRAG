package com.example.socialservice.dto;

import com.example.socialservice.enums.PostVisibility;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.multipart.MultipartFile;

@Schema(name = "PostCreateForm", description = "Form dữ liệu tạo bài viết (multipart/form-data)")
public class PostCreateForm {
    @Schema(description = "Nội dung bài viết", example = "Chào mọi người!")
    private String content;

    @Schema(description = "Chế độ hiển thị", example = "PUBLIC", allowableValues = {"PUBLIC", "PRIVATE"})
    private PostVisibility visibility = PostVisibility.PUBLIC;

    @ArraySchema(arraySchema = @Schema(description = "Danh sách file tải lên"),
            schema = @Schema(type = "string", format = "binary"))
    private MultipartFile[] files;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public PostVisibility getVisibility() { return visibility; }
    public void setVisibility(PostVisibility visibility) { this.visibility = visibility; }
    public MultipartFile[] getFiles() { return files; }
    public void setFiles(MultipartFile[] files) { this.files = files; }
}
