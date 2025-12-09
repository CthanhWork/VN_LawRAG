package com.example.socialservice.service;

import com.example.socialservice.dto.RegisterRequest;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.User;

import java.util.Optional;

public interface UserService {
    User register(RegisterRequest req, boolean pendingOnly) throws CustomException;
    Optional<User> getByEmail(String email);
    Optional<User> getById(Long id);
    User login(String email, String password) throws CustomException;
    User changePassword(Long userId, String currentPassword, String newPassword) throws CustomException;
    User resetPassword(String email, String newPassword) throws CustomException;
    User updateProfile(Long userId, String displayName) throws CustomException;
    User updateAvatar(Long userId, String avatarUrl, String avatarPublicId) throws CustomException;
}
