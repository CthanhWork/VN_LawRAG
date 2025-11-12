package com.example.socialservice.controller;

import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/social/posts")
@Tag(name = "Posts", description = "Tạo bài viết với hình ảnh/video")
public class PostController {
    private final PostService postService;
    private final JwtService jwtService;

    public PostController(PostService postService, JwtService jwtService) {
        this.postService = postService;
        this.jwtService = jwtService;
    }

    @PostMapping(consumes = { "multipart/form-data" })
    @Operation(summary = "Tạo bài viết (multipart)", description = "Trường form: content, files[]. Lấy authorId từ JWT nếu có, hoặc truyền authorId.")
    public ResponseEntity<ApiResponse<PostResponse>> create(
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "authorId", required = false) Long authorId,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorId(authorId, request);
        PostResponse resp = postService.createPost(uid, content, files);
        ApiResponse<PostResponse> body = ApiResponse.of(StatusCode.CREATED.getCode(), StatusCode.CREATED.getMessage(), resp);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private Long resolveAuthorId(Long authorId, HttpServletRequest request) {
        if (authorId != null) return authorId;
        String token = jwtService.extractToken(request);
        if (token != null && jwtService.validateToken(token)) {
            return jwtService.getUserIdFromJWT(token);
        }
        return null;
    }
}

