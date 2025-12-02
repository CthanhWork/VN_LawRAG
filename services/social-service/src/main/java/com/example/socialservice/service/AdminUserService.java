package com.example.socialservice.service;

import com.example.socialservice.dto.AdminUserResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.exception.CustomException;

public interface AdminUserService {
    PageResponse<AdminUserResponse> listUsers(String status, String keyword, int page, int size);
    AdminUserResponse getUser(Long userId) throws CustomException;
    AdminUserResponse updateStatus(Long userId, String status) throws CustomException;
    AdminUserResponse updateRoles(Long userId, String roles) throws CustomException;
}
