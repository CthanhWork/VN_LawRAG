package com.example.socialservice.service.impl;

import com.example.socialservice.dto.*;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.mapper.UserMapper;
import com.example.socialservice.model.User;
import com.example.socialservice.service.AuthService;
import com.example.socialservice.service.JwtService;
import com.example.socialservice.service.OtpService;
import com.example.socialservice.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserService userService;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final int otpTtlSeconds;

    public AuthServiceImpl(UserService userService,
                           OtpService otpService,
                           JwtService jwtService,
                           UserMapper userMapper,
                           @Value("${app.otp.ttl-seconds:600}") int otpTtlSeconds) {
        this.userService = userService;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.otpTtlSeconds = Math.max(60, otpTtlSeconds);
    }

    @Override
    public RegisterPendingResponse register(RegisterRequest request) throws CustomException {
        User u = userService.register(request, true);
        otpService.issueRegisterCode(u.getEmail());
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
        otpService.issueRegisterCode(request.getEmail());
        return new RegisterPendingResponse(true, request.getEmail(), otpTtlSeconds);
    }

    @Override
    public LoginResponse login(LoginRequest request) throws CustomException {
        User u = userService.login(request.getEmail(), request.getPassword());
        String token = jwtService.issue(u.getId().toString(), java.util.Map.of(
                "email", u.getEmail(),
                "displayName", u.getDisplayName(),
                "roles", u.getRoles()
        ));
        return userMapper.toLoginResponse(u, token);
    }
}

