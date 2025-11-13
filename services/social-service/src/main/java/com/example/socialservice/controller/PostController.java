package com.example.socialservice.controller;

import com.example.socialservice.dto.PostCreateForm;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.dto.CommentResponse;
import com.example.socialservice.dto.CommentCreateRequest;
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
        PostResponse resp = postService.createPost(uid, form.getContent(), form.getFiles(), form.getVisibility());
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
    

    // --- Likes ---
    @PostMapping("/{postId}/like")
    @Operation(summary = "Like bài viết")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Long>> like(
            @PathVariable("postId") Long postId,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        long count = postService.likePost(uid, postId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), count));
    }

    @DeleteMapping("/{postId}/like")
    @Operation(summary = "Bỏ like bài viết")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Long>> unlike(
            @PathVariable("postId") Long postId,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        long count = postService.unlikePost(uid, postId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), count));
    }

    // --- Comments ---
    @PostMapping("/{postId}/comments")
    @Operation(summary = "Thêm bình luận")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable("postId") Long postId,
            @RequestBody CommentCreateRequest req,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        CommentResponse res = postService.addComment(uid, postId, req.getContent());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(StatusCode.CREATED.getCode(), StatusCode.CREATED.getMessage(), res));
    }

    @PutMapping("/{postId}/comments/{commentId}")
    @Operation(summary = "Cập nhật bình luận (chỉ chủ bình luận)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @RequestBody CommentCreateRequest req,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        CommentResponse res = postService.updateComment(uid, postId, commentId, req.getContent());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), res));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    @Operation(summary = "Xóa bình luận (chỉ chủ bình luận)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            HttpServletRequest request
    ) throws CustomException {
        Long uid = resolveAuthorIdOrThrow(request);
        postService.deleteComment(uid, postId, commentId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), null));
    }

    @GetMapping("/{postId}/comments")
    @Operation(summary = "Danh sách bình luận theo bài viết")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> listComments(
            @PathVariable Long postId,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "10") int size
    ) throws CustomException {
        PageResponse<CommentResponse> data = postService.listComments(postId, page, size);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }
}
