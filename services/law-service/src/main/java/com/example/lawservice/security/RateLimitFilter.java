package com.example.lawservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final int capacity;
    private final int refillSeconds;

    private static class Bucket {
        double tokens;
        long lastRefillEpochSec;
        final int capacity;
        final int refillSeconds;

        Bucket(int capacity, int refillSeconds) {
            this.capacity = capacity;
            this.refillSeconds = refillSeconds;
            this.tokens = capacity;
            this.lastRefillEpochSec = Instant.now().getEpochSecond();
        }

        synchronized boolean tryConsume() {
            long nowSec = Instant.now().getEpochSecond();
            long elapsed = Math.max(0, nowSec - lastRefillEpochSec);
            if (elapsed > 0) {
                double ratePerSec = (double) capacity / (double) refillSeconds;
                tokens = Math.min(capacity, tokens + elapsed * ratePerSec);
                lastRefillEpochSec = nowSec;
            }
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
    }

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(
        @Value("${ratelimit.qa.capacity:60}") int capacity,
        @Value("${ratelimit.qa.refill-seconds:60}") int refillSeconds
    ) {
        this.capacity = capacity;
        this.refillSeconds = refillSeconds;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/qa");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String key = clientKey(request);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, refillSeconds));
        if (bucket.tryConsume()) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"rate_limited\",\"message\":\"Too many requests to /api/qa\"}");
        }
    }

    private String clientKey(HttpServletRequest request) {
        String apiKey = request.getHeader("X-API-KEY");
        if (apiKey != null && !apiKey.isBlank()) {
            return "apikey:" + apiKey.trim();
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        } else {
            int comma = ip.indexOf(',');
            if (comma > 0) ip = ip.substring(0, comma).trim();
        }
        return "ip:" + ip;
    }
}

