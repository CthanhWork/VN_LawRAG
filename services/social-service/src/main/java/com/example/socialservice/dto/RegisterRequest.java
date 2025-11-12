package com.example.socialservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {
    @Email(message = "email không hợp lệ")
    @NotBlank(message = "email là bắt buộc")
    private String email;

    @NotBlank(message = "password là bắt buộc")
    @Size(min = 8, message = "password phải tối thiểu 8 ký tự")
    private String password;

    @NotBlank(message = "displayName là bắt buộc")
    @Size(min = 3, max = 50, message = "displayName 3-50 ký tự")
    private String displayName;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}

