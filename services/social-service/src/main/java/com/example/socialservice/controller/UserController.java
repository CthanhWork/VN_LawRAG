package com.example.socialservice.controller;

import com.example.socialservice.dto.UpdateProfileRequest;
import com.example.socialservice.dto.UserProfileResponse;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.mapper.UserMapper;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.CloudinaryService;
import com.example.socialservice.service.CloudinaryUploadResult;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/social/users")
@Tag(name = "Users", description = "Quan ly thong tin nguoi dung")
public class UserController {
    private final UserService userService;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final CloudinaryService cloudinaryService;

    public UserController(UserService userService, JwtService jwtService, UserMapper userMapper,
            CloudinaryService cloudinaryService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.cloudinaryService = cloudinaryService;
    }

    @PatchMapping("/me")
    @Operation(summary = "Cap nhat thong tin nguoi dung (chi displayName)", description = "Yeu cau Bearer token")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMe(
            @Valid @RequestBody UpdateProfileRequest req,
            HttpServletRequest request
    ) throws CustomException {
        Long userId = resolveUserIdOrThrow(request);
        var updated = userService.updateProfile(userId, req.getDisplayName());
        var body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), userMapper.toProfileResponse(updated));
        return ResponseEntity.ok(body);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cap nhat anh dai dien", description = "Upload avatar len Cloudinary")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserProfileResponse>> uploadAvatar(
            @RequestPart("file") MultipartFile file,
            HttpServletRequest request
    ) throws CustomException {
        Long userId = resolveUserIdOrThrow(request);
        if (file == null || file.isEmpty()) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "Missing avatar file");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "Avatar phai la hinh anh");
        }
        if (!cloudinaryService.isEnabled()) {
            throw new CustomException(StatusCode.VALIDATION_ERROR,
                    "Cloudinary chua duoc cau hinh (thieu CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)");
        }
        var existing = userService.getById(userId).orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        String oldPublicId = existing.getAvatarPublicId();
        try {
            CloudinaryUploadResult upload = cloudinaryService.upload(file, "avatars/" + userId);
            var updated = userService.updateAvatar(userId, upload.url(), upload.publicId());
            if (StringUtils.hasText(oldPublicId) && !oldPublicId.equals(upload.publicId())) {
                cloudinaryService.delete(oldPublicId, upload.resourceType());
            }
            var body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), userMapper.toProfileResponse(updated));
            return ResponseEntity.ok(body);
        } catch (java.io.IOException ex) {
            throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, "Failed to upload avatar");
        }
    }

    @DeleteMapping("/me/avatar")
    @Operation(summary = "Xoa avatar", description = "Xoa khoi Cloudinary va cap nhat ho so")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<UserProfileResponse>> removeAvatar(
            HttpServletRequest request
    ) throws CustomException {
        Long userId = resolveUserIdOrThrow(request);
        var existing = userService.getById(userId).orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (StringUtils.hasText(existing.getAvatarPublicId())) {
            cloudinaryService.delete(existing.getAvatarPublicId(), "image");
        }
        var updated = userService.updateAvatar(userId, null, null);
        var body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), userMapper.toProfileResponse(updated));
        return ResponseEntity.ok(body);
    }

    private Long resolveUserIdOrThrow(HttpServletRequest request) throws CustomException {
        String token = jwtService.extractToken(request);
        if (token != null && jwtService.validateToken(token)) {
            return jwtService.getUserIdFromJWT(token);
        }
        throw new CustomException(StatusCode.UNAUTHORIZED);
    }
}
