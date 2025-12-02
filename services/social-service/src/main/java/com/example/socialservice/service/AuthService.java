package com.example.socialservice.service;

import com.example.socialservice.dto.*;
import com.example.socialservice.exception.CustomException;

public interface AuthService {
    RegisterPendingResponse register(RegisterRequest request) throws CustomException;
    RegisterResponse verifyOtp(VerifyOtpRequest request) throws CustomException;
    RegisterPendingResponse resendOtp(ResendOtpRequest request) throws CustomException;
    LoginResponse login(LoginRequest request) throws CustomException;
    RegisterPendingResponse requestPasswordReset(ResendOtpRequest request) throws CustomException;
    void resetPassword(ResetPasswordRequest request) throws CustomException;
    void changePassword(Long userId, ChangePasswordRequest request) throws CustomException;
    RefreshTokenResponse refreshToken(RefreshTokenRequest request) throws CustomException;
}
