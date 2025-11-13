package com.example.socialservice.controller;

import com.example.socialservice.dto.PostCreateForm;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.ModelAttribute;

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

    @GetMapping("/mine")
    @Operation(summary = "Danh sách bài viết của tôi", description = "Phân trang: page,size. Lấy userId từ JWT.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> myPosts(
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        PageResponse<PostResponse> data = postService.listMyPosts(uid, page, size);
        ApiResponse<PageResponse<PostResponse>> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/users/{userId}/posts")
    @Operation(summary = "Danh sách bài viết của người dùng", description = "Chỉ trả về bài viết PUBLIC nếu không phải chủ sở hữu")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> userPosts(
            @PathVariable("userId") Long userId,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size,
            HttpServletRequest request
    ) throws CustomException {
        Long currentUserId = resolveAuthorIdOrThrow(request);
        PageResponse<PostResponse> data = postService.listUserPosts(userId, currentUserId, page, size);
        ApiResponse<PageResponse<PostResponse>> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data);
        return ResponseEntity.ok(body);
    }

    @PostMapping(consumes = { "multipart/form-data" })
    @Operation(summary = "Tạo bài viết (multipart)", description = "Form: content, files[]; userId lấy từ JWT Bearer token.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PostResponse>> create(
            @ModelAttribute PostCreateForm form,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        PostResponse resp = postService.createPost(uid, form.getContent(), form.getFiles());
        ApiResponse<PostResponse> body = ApiResponse.of(StatusCode.CREATED.getCode(), StatusCode.CREATED.getMessage(), resp);
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private Long resolveAuthorIdOrThrow(HttpServletRequest request) throws CustomException {
        String token = jwtService.extractToken(request);
        if (token != null && jwtService.validateToken(token)) {
            return jwtService.getUserIdFromJWT(token);
        }
        throw new CustomException(StatusCode.UNAUTHORIZED);
    }
}
