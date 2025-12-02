package com.example.socialservice.controller;

import com.example.socialservice.dto.*;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.AuthService;
import com.example.socialservice.service.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social/auth")
@Tag(name = "Auth", description = "Đăng ký/đăng nhập, quên mật khẩu và đổi mật khẩu")
public class AuthController {
    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký người dùng mới (yêu cầu xác thực OTP)")
    public ResponseEntity<ApiResponse<RegisterPendingResponse>> register(@Valid @RequestBody RegisterRequest req) throws CustomException {
        RegisterPendingResponse result = authService.register(req);
        ApiResponse<RegisterPendingResponse> body = ApiResponse.of(StatusCode.ACCEPTED.getCode(),
                StatusCode.ACCEPTED.getMessage(), result);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Xác thực OTP để kích hoạt tài khoản")
    public ResponseEntity<ApiResponse<RegisterResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) throws CustomException {
        RegisterResponse result = authService.verifyOtp(req);
        ApiResponse<RegisterResponse> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), result);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Gửi lại OTP đăng ký")
    public ResponseEntity<ApiResponse<RegisterPendingResponse>> resendOtp(@Valid @RequestBody ResendOtpRequest req) throws CustomException {
        RegisterPendingResponse result = authService.resendOtp(req);
        ApiResponse<RegisterPendingResponse> body = ApiResponse.of(StatusCode.ACCEPTED.getCode(),
                StatusCode.ACCEPTED.getMessage(), result);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập, trả về JWT nếu thành công")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest req) throws CustomException {
        LoginResponse result = authService.login(req);
        ApiResponse<LoginResponse> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), result);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Lấy access token mới từ refresh token")
    public ResponseEntity<ApiResponse<RefreshTokenResponse>> refresh(@Valid @RequestBody RefreshTokenRequest req) throws CustomException {
        RefreshTokenResponse result = authService.refreshToken(req);
        ApiResponse<RefreshTokenResponse> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), result);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Quên mật khẩu - yêu cầu OTP đặt lại")
    public ResponseEntity<ApiResponse<RegisterPendingResponse>> forgotPassword(@Valid @RequestBody ResendOtpRequest req) throws CustomException {
        RegisterPendingResponse result = authService.requestPasswordReset(req);
        ApiResponse<RegisterPendingResponse> body = ApiResponse.of(StatusCode.ACCEPTED.getCode(),
                StatusCode.ACCEPTED.getMessage(), result);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu bằng OTP")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) throws CustomException {
        authService.resetPassword(req);
        ApiResponse<Void> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), null);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu", description = "Yêu cầu Bearer token, kiểm tra mật khẩu hiện tại")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            HttpServletRequest request
    ) throws CustomException {
        Long userId = resolveUserIdOrThrow(request);
        authService.changePassword(userId, req);
        ApiResponse<Void> body = ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), null);
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
