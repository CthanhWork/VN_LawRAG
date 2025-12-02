package com.example.socialservice.service.impl;

import com.example.socialservice.dto.RegisterRequest;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.User;
import com.example.socialservice.repository.UserRepository;
import com.example.socialservice.service.UserService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public User register(RegisterRequest req, boolean pendingOnly) throws CustomException {
        Optional<User> existingOpt = userRepository.findByEmailIgnoreCase(req.getEmail());
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if ("ACTIVE".equalsIgnoreCase(existing.getStatus())) {
                throw new CustomException(StatusCode.EMAIL_TAKEN);
            }
            // Already registered but not verified
            throw new CustomException(StatusCode.USER_PENDING);
        } else {
            User u = new User();
            u.setEmail(req.getEmail().trim());
            u.setDisplayName(req.getDisplayName().trim());
            u.setPasswordHash(encoder.encode(req.getPassword()));
            u.setStatus(pendingOnly ? "PENDING" : "ACTIVE");
            u.setRoles("USER");
            return userRepository.save(u);
        }
    }

    @Override
    public Optional<User> getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    @Override
    public Optional<User> getById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public User login(String email, String password) throws CustomException {
        User u = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new CustomException(StatusCode.INVALID_CREDENTIALS));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        if (!encoder.matches(password, u.getPasswordHash())) {
            throw new CustomException(StatusCode.INVALID_CREDENTIALS);
        }
        return u;
    }

    @Override
    @Transactional
    public User changePassword(Long userId, String currentPassword, String newPassword) throws CustomException {
        if (newPassword == null || newPassword.length() < 8) {
            throw new CustomException(StatusCode.PASSWORD_WEAK);
        }
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        if (!encoder.matches(currentPassword, u.getPasswordHash())) {
            throw new CustomException(StatusCode.INVALID_CREDENTIALS);
        }
        u.setPasswordHash(encoder.encode(newPassword));
        return userRepository.save(u);
    }

    @Override
    @Transactional
    public User resetPassword(String email, String newPassword) throws CustomException {
        if (newPassword == null || newPassword.length() < 8) {
            throw new CustomException(StatusCode.PASSWORD_WEAK);
        }
        User u = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        u.setPasswordHash(encoder.encode(newPassword));
        return userRepository.save(u);
    }

    @Override
    @Transactional
    public User updateProfile(Long userId, String displayName) throws CustomException {
        String trimmed = displayName == null ? null : displayName.trim();
        if (trimmed == null || trimmed.length() < 3 || trimmed.length() > 50) {
            throw new CustomException(StatusCode.VALIDATION_ERROR);
        }
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
            throw new CustomException(StatusCode.USER_NOT_ACTIVE);
        }
        u.setDisplayName(trimmed);
        return userRepository.save(u);
    }
}
