package com.example.socialservice.service;

import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminAuthService {
    private final JwtService jwtService;

    public AdminAuthService(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public Long requireAdmin(HttpServletRequest request) throws CustomException {
        String token = jwtService.extractToken(request);
        if (token == null || !jwtService.validateToken(token)) {
            throw new CustomException(StatusCode.UNAUTHORIZED);
        }
        String roles = jwtService.getRolesFromJWT(token);
        if (!hasRole(roles, "ADMIN")) {
            throw new CustomException(StatusCode.FORBIDDEN);
        }
        return jwtService.getUserIdFromJWT(token);
    }

    private boolean hasRole(String roles, String required) {
        if (!StringUtils.hasText(roles)) return false;
        for (String r : roles.split(",")) {
            if (required.equalsIgnoreCase(r.trim())) {
                return true;
            }
        }
        return false;
    }
}
