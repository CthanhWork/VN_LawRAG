package com.example.socialservice.controller;

import com.example.socialservice.dto.*;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social/auth")
@Tag(name = "Auth", description = "Đăng ký/đăng nhập người dùng (chuẩn hoá controller)")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
}

