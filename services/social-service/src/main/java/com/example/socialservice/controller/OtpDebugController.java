package com.example.socialservice.controller;

import com.example.socialservice.dto.ResendOtpRequest;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.payload.ApiResponse;
import com.example.socialservice.service.OtpService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/social/auth/_debug")
@ConditionalOnProperty(prefix = "app.otp", name = "debug-enabled", havingValue = "true", matchIfMissing = false)
public class OtpDebugController {
    private final OtpService otpService;
    private final StringRedisTemplate redis;

    public OtpDebugController(OtpService otpService, StringRedisTemplate redis) {
        this.otpService = otpService;
        this.redis = redis;
    }

    private String key(String email) {
        return "otp:register:" + email.toLowerCase();
    }

    @PostMapping("/issue")
    public ResponseEntity<ApiResponse<Map<String, Object>>> issue(@RequestBody ResendOtpRequest req) throws CustomException {
        String code = otpService.issueRegisterCode(req.getEmail());
        String k = key(req.getEmail());
        Long ttl = redis.getExpire(k);
        Map<String, Object> data = new HashMap<>();
        data.put("key", k);
        data.put("code", code);
        data.put("ttl", ttl);
        data.put("hash", redis.opsForHash().entries(k));
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }

    @GetMapping("/get")
    public ResponseEntity<ApiResponse<Map<String, Object>>> get(@RequestParam String email) {
        String k = key(email);
        boolean exists = Boolean.TRUE.equals(redis.hasKey(k));
        Map<String, Object> data = new HashMap<>();
        data.put("exists", exists);
        data.put("key", k);
        data.put("ttl", redis.getExpire(k));
        data.put("hash", exists ? redis.opsForHash().entries(k) : Map.of());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }
}

