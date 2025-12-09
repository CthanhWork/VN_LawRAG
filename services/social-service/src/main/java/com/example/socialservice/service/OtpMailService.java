package com.example.socialservice.service;

public interface OtpMailService {

    void sendRegisterOtp(String email, String otp);

    void sendResetOtp(String email, String otp);
}
