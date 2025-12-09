package com.example.socialservice.service.impl;

import com.example.socialservice.dto.*;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.mapper.UserMapper;
import com.example.socialservice.model.User;
import com.example.socialservice.service.AuthService;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.OtpMailService;
import com.example.socialservice.service.OtpService;
import com.example.socialservice.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserService userService;
    private final OtpService otpService;
    private final OtpMailService otpMailService;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final int otpTtlSeconds;

    public AuthServiceImpl(UserService userService,
                           OtpService otpService,
                           OtpMailService otpMailService,
                           JwtService jwtService,
                           UserMapper userMapper,
                           @Value("${app.otp.ttl-seconds:600}") int otpTtlSeconds) {
        this.userService = userService;
        this.otpService = otpService;
        this.otpMailService = otpMailService;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.otpTtlSeconds = Math.max(60, otpTtlSeconds);
    }

    @Override
    public RegisterPendingResponse register(RegisterRequest request) throws CustomException {
        User u = userService.register(request, true);
        String code = otpService.issueRegisterCode(u.getEmail());
        otpMailService.sendRegisterOtp(u.getEmail(), code);
        return new RegisterPendingResponse(true, u.getEmail(), otpTtlSeconds);
    }

    @Override
    public RegisterResponse verifyOtp(VerifyOtpRequest request) throws CustomException {
        User u = otpService.verifyRegisterCode(request.getEmail(), request.getCode());
        return userMapper.toRegisterResponse(u);
    }

    @Override
    public RegisterPendingResponse resendOtp(ResendOtpRequest request) throws CustomException {
        User u = userService.getByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if ("ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_ALREADY_ACTIVE);
        }
        String code = otpService.issueRegisterCode(request.getEmail());
        otpMailService.sendRegisterOtp(request.getEmail(), code);
        return new RegisterPendingResponse(true, request.getEmail(), otpTtlSeconds);
    }

    @Override
    public LoginResponse login(LoginRequest request) throws CustomException {
        User u = userService.login(request.getEmail(), request.getPassword());
        java.util.Map<String, Object> claims = new java.util.HashMap<>();
        claims.put("email", u.getEmail());
        claims.put("displayName", u.getDisplayName());
        if (u.getAvatarUrl() != null) claims.put("avatarUrl", u.getAvatarUrl());
        claims.put("roles", u.getRoles());
        String token = jwtService.issue(u.getId().toString(), claims);
        String refreshToken = jwtService.generateRefreshToken(u);
        return userMapper.toLoginResponse(u, token, refreshToken);
    }

    @Override
    public RegisterPendingResponse requestPasswordReset(ResendOtpRequest request) throws CustomException {
        User u = userService.getByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        String code = otpService.issueResetCode(u.getEmail());
        otpMailService.sendResetOtp(u.getEmail(), code);
        return new RegisterPendingResponse(true, u.getEmail(), otpTtlSeconds);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) throws CustomException {
        otpService.verifyResetCode(request.getEmail(), request.getCode());
        userService.resetPassword(request.getEmail(), request.getNewPassword());
    }

    @Override
    public void changePassword(Long userId, ChangePasswordRequest request) throws CustomException {
        userService.changePassword(userId, request.getCurrentPassword(), request.getNewPassword());
    }

    @Override
    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) throws CustomException {
        String refresh = request.getRefreshToken();
        if (refresh == null || refresh.isBlank()) {
            throw new CustomException(StatusCode.UNAUTHORIZED);
        }
        if (!jwtService.validateToken(refresh)) {
            throw new CustomException(StatusCode.UNAUTHORIZED);
        }
        Long userId = jwtService.getUserIdFromJWT(refresh);
        User u = userService.getById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        String accessToken = jwtService.generateAccessToken(u);
        String newRefresh = jwtService.generateRefreshToken(u);
        return new RefreshTokenResponse(accessToken, newRefresh);
    }
}
