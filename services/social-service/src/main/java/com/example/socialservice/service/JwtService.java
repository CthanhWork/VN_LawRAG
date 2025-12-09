package com.example.socialservice.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.example.socialservice.model.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final String jwtSecret;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;
    private final String audience;
    private final String issuer;

    public JwtService(
            @Value("${app.jwt.secret:change-me-please}") String secret,
            @Value("${app.jwt.ttl-seconds:3600}") long accessTtlSeconds,
            @Value("${app.jwt.refresh-ttl-seconds:604800}") long refreshTtlSeconds,
            @Value("${app.jwt.audience:vn-law}") String audience,
            @Value("${app.jwt.issuer:social-service}") String issuer
    ) {
        this.jwtSecret = secret;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
        this.audience = audience;
        this.issuer = issuer;
    }

    private Algorithm getAlgorithm() {
        return Algorithm.HMAC256(jwtSecret);
    }

    // Backward-compatible issuing method used by AuthServiceImpl
    public String issue(String subject, Map<String, Object> claims) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + Math.max(60_000L, accessTtlSeconds * 1000));
        com.auth0.jwt.JWTCreator.Builder builder = JWT.create()
                .withSubject(subject)
                .withAudience(audience)
                .withIssuer(issuer)
                .withIssuedAt(now)
                .withExpiresAt(exp);
        if (claims != null) {
            claims.forEach((k, v) -> {
                if (v == null) return;
                if (v instanceof String s) builder.withClaim(k, s);
                else if (v instanceof Integer i) builder.withClaim(k, i);
                else if (v instanceof Long l) builder.withClaim(k, l);
                else if (v instanceof Boolean b) builder.withClaim(k, b);
                else builder.withClaim(k, String.valueOf(v));
            });
        }
        return builder.sign(getAlgorithm());
    }

    // Convenience helpers similar to your sample
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + Math.max(60_000L, accessTtlSeconds * 1000));
        return JWT.create()
                .withSubject(String.valueOf(user.getId()))
                .withAudience(audience)
                .withIssuer(issuer)
                .withIssuedAt(now)
                .withExpiresAt(exp)
                .withClaim("email", user.getEmail())
                .withClaim("displayName", user.getDisplayName())
                .withClaim("avatarUrl", user.getAvatarUrl())
                .withClaim("roles", user.getRoles())
                .sign(getAlgorithm());
    }

    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + Math.max(60_000L, refreshTtlSeconds * 1000));
        return JWT.create()
                .withSubject(String.valueOf(user.getId()))
                .withAudience(audience)
                .withIssuer(issuer)
                .withIssuedAt(now)
                .withExpiresAt(exp)
                .withClaim("roles", user.getRoles())
                .sign(getAlgorithm());
    }

    public Long getUserIdFromJWT(String token) {
        DecodedJWT jwt = JWT.require(getAlgorithm()).withIssuer(issuer).build().verify(token);
        return Long.parseLong(jwt.getSubject());
    }

    public String getEmailFromJWT(String token) {
        DecodedJWT jwt = JWT.require(getAlgorithm()).withIssuer(issuer).build().verify(token);
        return jwt.getClaim("email").asString();
    }

    public boolean validateToken(String token) {
        try {
            JWT.require(getAlgorithm()).withIssuer(issuer).build().verify(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public String getRolesFromJWT(String token) {
        DecodedJWT jwt = JWT.require(getAlgorithm()).withIssuer(issuer).build().verify(token);
        return jwt.getClaim("roles").asString();
    }

    public String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
