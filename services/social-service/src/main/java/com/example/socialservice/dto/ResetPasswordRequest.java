package com.example.socialservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ResetPasswordRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số")
    private String code;

    @NotBlank
    @Size(min = 8, message = "password phải tối thiểu 8 ký tự")
    private String newPassword;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}

