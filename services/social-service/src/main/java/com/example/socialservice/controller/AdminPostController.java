package com.example.socialservice.controller;

import com.example.socialservice.dto.CommentResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.dto.UpdateVisibilityRequest;
import com.example.socialservice.enums.PostVisibility;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.AdminAuthService;
import com.example.socialservice.service.AdminPostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/social/posts")
@Tag(name = "Admin Posts", description = "Quan ly bai viet, binh luan")
public class AdminPostController {
    private final AdminAuthService adminAuthService;
    private final AdminPostService adminPostService;

    public AdminPostController(AdminAuthService adminAuthService, AdminPostService adminPostService) {
        this.adminAuthService = adminAuthService;
        this.adminPostService = adminPostService;
    }

    @GetMapping
    @Operation(summary = "Danh sach bai viet", description = "Filter theo authorId va visibility")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PageResponse<PostResponse>>> list(
            @RequestParam(value = "authorId", required = false) Long authorId,
            @RequestParam(value = "visibility", required = false) PostVisibility visibility,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        PageResponse<PostResponse> data = adminPostService.listPosts(authorId, visibility, page, size);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @GetMapping("/{postId}")
    @Operation(summary = "Chi tiet bai viet")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PostResponse>> detail(
            @PathVariable("postId") Long postId,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        PostResponse data = adminPostService.getPost(postId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @PatchMapping("/{postId}/visibility")
    @Operation(summary = "Cap nhat visibility bai viet")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PostResponse>> updateVisibility(
            @PathVariable("postId") Long postId,
            @Valid @RequestBody UpdateVisibilityRequest req,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        PostResponse data = adminPostService.updateVisibility(postId, req.getVisibility());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @DeleteMapping("/{postId}")
    @Operation(summary = "Xoa bai viet")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable("postId") Long postId,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        adminPostService.deletePost(postId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), null));
    }

    @GetMapping("/{postId}/comments")
    @Operation(summary = "Danh sach binh luan cua bai viet")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> listComments(
            @PathVariable("postId") Long postId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        PageResponse<CommentResponse> data = adminPostService.listComments(postId, page, size);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    @Operation(summary = "Xoa binh luan")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable("postId") Long postId,
            @PathVariable("commentId") Long commentId,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        adminPostService.deleteComment(postId, commentId);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), null));
    }
}
