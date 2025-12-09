package com.example.socialservice.service.impl;

import com.example.socialservice.dto.AdminUserResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.User;
import com.example.socialservice.repository.UserRepository;
import com.example.socialservice.service.AdminUserService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminUserServiceImpl implements AdminUserService {
    private static final Set<String> ALLOWED_STATUS = Set.of("ACTIVE", "PENDING", "DISABLED");

    private final UserRepository userRepository;

    public AdminUserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> listUsers(String status, String keyword, int page, int size) {
        int pageSafe = Math.max(0, page);
        int sizeSafe = Math.min(50, Math.max(1, size));
        String statusFilter = normalizeStatus(status);
        String keywordFilter = StringUtils.hasText(keyword) ? keyword.trim() : null;

        var pageable = PageRequest.of(pageSafe, sizeSafe);
        var pg = userRepository.searchUsers(statusFilter, keywordFilter, pageable);
        List<AdminUserResponse> items = pg.getContent().stream().map(this::toDto).toList();
        return new PageResponse<>(items, pg.getNumber(), pg.getSize(), pg.getTotalElements(), pg.getTotalPages(),
                pg.hasNext(), pg.hasPrevious());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserResponse getUser(Long userId) throws CustomException {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        return toDto(u);
    }

    @Override
    @Transactional
    public AdminUserResponse updateStatus(Long userId, String status) throws CustomException {
        String normalized = normalizeStatus(status);
        if (normalized == null || !ALLOWED_STATUS.contains(normalized)) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "Invalid status");
        }
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        u.setStatus(normalized);
        User saved = userRepository.save(u);
        return toDto(saved);
    }

    @Override
    @Transactional
    public AdminUserResponse updateRoles(Long userId, String roles) throws CustomException {
        String normalized = normalizeRoles(roles);
        if (normalized == null) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "Invalid roles");
        }
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        u.setRoles(normalized);
        User saved = userRepository.save(u);
        return toDto(saved);
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) return null;
        return status.trim().toUpperCase();
    }

    private String normalizeRoles(String roles) {
        if (!StringUtils.hasText(roles)) return null;
        Set<String> collected = Arrays.stream(roles.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(String::toUpperCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (collected.isEmpty()) return null;
        String result = String.join(",", collected);
        return result.length() <= 100 ? result : result.substring(0, 100);
    }

    private AdminUserResponse toDto(User u) {
        return new AdminUserResponse(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getStatus(),
                u.getRoles(),
                u.getAvatarUrl(),
                u.getCreatedAt(),
                u.getUpdatedAt());
    }
}
