package com.example.socialservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public class UpdateUserRolesRequest {
    @Schema(description = "Danh sach role, phan cach boi dau phay", example = "ADMIN,USER")
    @NotBlank
    private String roles;

    public String getRoles() { return roles; }
    public void setRoles(String roles) { this.roles = roles; }
}
