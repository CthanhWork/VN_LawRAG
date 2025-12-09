package com.example.socialservice.service;

import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.User;
import com.example.socialservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;

@Service
public class OtpService {
    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private final StringRedisTemplate redis;
    private final UserRepository userRepo;
    private final SecureRandom rng = new SecureRandom();

    @Value("${app.otp.ttl-seconds:600}")
    private int ttlSeconds;

    @Value("${app.otp.dev-no-expire:false}")
    private boolean devNoExpire;

    @Value("${app.otp.log-key:false}")
    private boolean logKey;

    public OtpService(StringRedisTemplate redis, UserRepository userRepo) {
        this.redis = redis;
        this.userRepo = userRepo;
    }

    private String key(String email) {
        return "otp:register:" + email.toLowerCase();
    }

    private String resetKey(String email) {
        return "otp:reset:" + email.toLowerCase();
    }

    public String generate6Digits() {
        int code = 100000 + rng.nextInt(900000);
        return String.valueOf(code);
    }

    public String issueRegisterCode(String email) {
        String k = key(email);
        HashOperations<String, String, String> h = redis.opsForHash();
        // overwrite existing
        String code = generate6Digits();
        h.put(k, "code", code);
        h.put(k, "attempts", "0");
        h.put(k, "max", "5");
        h.put(k, "consumed", "0");
        h.put(k, "createdAt", Long.toString(System.currentTimeMillis() / 1000));
        if (!devNoExpire) {
            redis.expire(k, Duration.ofSeconds(Math.max(60, ttlSeconds)));
        }
        if (logKey) {
            Long ttl = redis.getExpire(k);
            log.info("OTP issued for email={}, key={}, ttl={}s (noExpire={})", email, k, ttl, devNoExpire);
        }
        return code;
    }

    public String issueResetCode(String email) throws CustomException {
        userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        String k = resetKey(email);
        HashOperations<String, String, String> h = redis.opsForHash();
        String code = generate6Digits();
        h.put(k, "code", code);
        h.put(k, "attempts", "0");
        h.put(k, "max", "5");
        h.put(k, "consumed", "0");
        h.put(k, "createdAt", Long.toString(System.currentTimeMillis() / 1000));
        if (!devNoExpire) {
            redis.expire(k, Duration.ofSeconds(Math.max(60, ttlSeconds)));
        }
        if (logKey) {
            Long ttl = redis.getExpire(k);
            log.info("Reset OTP issued for email={}, key={}, ttl={}s (noExpire={})", email, k, ttl, devNoExpire);
        }
        return code;
    }

    @Transactional
    public User verifyRegisterCode(String email, String code) throws CustomException {
        String k = key(email);
        HashOperations<String, String, String> h = redis.opsForHash();
        if (!Boolean.TRUE.equals(redis.hasKey(k))) {
            throw new CustomException(StatusCode.OTP_NOT_FOUND);
        }
        String consumed = h.get(k, "consumed");
        if ("1".equals(consumed)) {
            throw new CustomException(StatusCode.OTP_CONSUMED);
        }
        int attempts = 0;
        try { attempts = Integer.parseInt(h.get(k, "attempts")); } catch (Exception ignored) {}
        int max = 5;
        try { max = Integer.parseInt(h.get(k, "max")); } catch (Exception ignored) {}
        if (attempts >= max) {
            throw new CustomException(StatusCode.OTP_TOO_MANY_ATTEMPTS);
        }
        String expect = h.get(k, "code");
        if (expect == null) {
            throw new CustomException(StatusCode.OTP_NOT_FOUND);
        }
        if (!expect.equals(code)) {
            h.increment(k, "attempts", 1);
            throw new CustomException(StatusCode.OTP_INVALID);
        }
        // success: mark consumed and delete key to be safe
        redis.delete(k);
        if (logKey) {
            log.info("OTP verified for email={}, key={} deleted", email, k);
        }

        User user = userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new CustomException(StatusCode.USER_NOT_FOUND));
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            user.setStatus("ACTIVE");
            user = userRepo.save(user);
        }
        return user;
    }

    @Transactional
    public void verifyResetCode(String email, String code) throws CustomException {
        String k = resetKey(email);
        HashOperations<String, String, String> h = redis.opsForHash();
        if (!Boolean.TRUE.equals(redis.hasKey(k))) {
            throw new CustomException(StatusCode.OTP_NOT_FOUND);
        }
        String consumed = h.get(k, "consumed");
        if ("1".equals(consumed)) {
            throw new CustomException(StatusCode.OTP_CONSUMED);
        }
        int attempts = 0;
        try { attempts = Integer.parseInt(h.get(k, "attempts")); } catch (Exception ignored) {}
        int max = 5;
        try { max = Integer.parseInt(h.get(k, "max")); } catch (Exception ignored) {}
        if (attempts >= max) {
            throw new CustomException(StatusCode.OTP_TOO_MANY_ATTEMPTS);
        }
        String expect = h.get(k, "code");
        if (expect == null) {
            throw new CustomException(StatusCode.OTP_NOT_FOUND);
        }
        if (!expect.equals(code)) {
            h.increment(k, "attempts", 1);
            throw new CustomException(StatusCode.OTP_INVALID);
        }
        redis.delete(k);
        if (logKey) {
            log.info("Reset OTP verified for email={}, key={} deleted", email, k);
        }
    }
}
