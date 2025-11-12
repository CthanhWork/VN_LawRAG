package com.example.socialservice.service;

import com.example.socialservice.dto.RegisterRequest;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.User;

import java.util.Optional;

public interface UserService {
    User register(RegisterRequest req, boolean pendingOnly) throws CustomException;
    Optional<User> getByEmail(String email);
    User login(String email, String password) throws CustomException;
}
