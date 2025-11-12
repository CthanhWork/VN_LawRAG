package com.example.socialservice.dto;

public class LoginResponse {
    private String token;
    private Long id;
    private String email;
    private String displayName;

    public LoginResponse(){}
    public LoginResponse(String token, Long id, String email, String displayName) {
        this.token = token; this.id = id; this.email = email; this.displayName = displayName;
    }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}

