package com.example.socialservice.controller;

import com.example.socialservice.dto.AdminUserResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.UpdateUserRolesRequest;
import com.example.socialservice.dto.UpdateUserStatusRequest;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.AdminAuthService;
import com.example.socialservice.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/social/users")
@Tag(name = "Admin Users", description = "Quan ly nguoi dung mang xa hoi")
public class AdminUserController {
    private final AdminAuthService adminAuthService;
    private final AdminUserService adminUserService;

    public AdminUserController(AdminAuthService adminAuthService, AdminUserService adminUserService) {
        this.adminAuthService = adminAuthService;
        this.adminUserService = adminUserService;
    }

    @GetMapping
    @Operation(summary = "Danh sach user", description = "Filter theo status va keyword (email/displayName)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<PageResponse<AdminUserResponse>>> list(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        PageResponse<AdminUserResponse> data = adminUserService.listUsers(status, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiet user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<AdminUserResponse>> detail(
            @PathVariable("id") Long id,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        AdminUserResponse data = adminUserService.getUser(id);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cap nhat trang thai user", description = "ACTIVE | PENDING | DISABLED")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateStatus(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateUserStatusRequest req,
            HttpServletRequest request
    ) throws CustomException {
        adminAuthService.requireAdmin(request);
        AdminUserResponse data = adminUserService.updateStatus(id, req.getStatus());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @PatchMapping("/{id}/roles")
    @Operation(summary = "Cap nhat roles user", description = "Nhap danh sach role, phan cach boi dau phay")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateRoles(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateUserRolesRequest req,
            HttpServletRequest request
    ) throws CustomException {
        Long adminId = adminAuthService.requireAdmin(request);
        if (adminId != null && adminId.equals(id)) {
            throw new CustomException(StatusCode.FORBIDDEN, "Admin khong the tu thay doi role cua chinh minh");
        }
        AdminUserResponse data = adminUserService.updateRoles(id, req.getRoles());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }
}
