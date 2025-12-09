package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Thong tin tai khoan")
public class UserProfileResponse {
    private Long id;
    private String email;
    private String displayName;
    private String status;
    private String roles;
    private String avatarUrl;

    public UserProfileResponse() {}

    public UserProfileResponse(Long id, String email, String displayName, String status, String roles, String avatarUrl) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.status = status;
        this.roles = roles;
        this.avatarUrl = avatarUrl;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRoles() { return roles; }
    public void setRoles(String roles) { this.roles = roles; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
