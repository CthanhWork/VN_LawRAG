package com.example.socialservice.controller;

import com.example.socialservice.dto.UpdateProfileRequest;
import com.example.socialservice.dto.UserProfileResponse;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.mapper.UserMapper;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/social/users")
@Tag(name = "Users", description = "Quan ly thong tin nguoi dung")
public class UserController {
    private final UserService userService;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    public UserController(UserService userService, JwtService jwtService, UserMapper userMapper) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
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

    private Long resolveUserIdOrThrow(HttpServletRequest request) throws CustomException {
        String token = jwtService.extractToken(request);
        if (token != null && jwtService.validateToken(token)) {
            return jwtService.getUserIdFromJWT(token);
        }
        throw new CustomException(StatusCode.UNAUTHORIZED);
    }
}
