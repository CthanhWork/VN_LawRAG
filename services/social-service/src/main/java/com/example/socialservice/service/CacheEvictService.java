package com.example.socialservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class CacheEvictService {
    private static final Logger log = LoggerFactory.getLogger(CacheEvictService.class);
    private final StringRedisTemplate redis;
    private final String prefix;

    public CacheEvictService(StringRedisTemplate redis,
                             @Value("${spring.cache.redis.key-prefix:social:}") String prefix) {
        this.redis = redis;
        this.prefix = prefix;
    }

    public void evictMyPostsForUser(Long userId) {
        deleteByPattern(prefix + "myPosts::" + userId + ":*");
    }

    public void evictUserPostsForTarget(Long targetUserId) {
        deleteByPattern(prefix + "userPosts::" + targetUserId + ":*");
    }

    public void evictPublicFeed() {
        deleteByPattern(prefix + "publicFeed::*");
    }

    private void deleteByPattern(String pattern) {
        try {
            Set<String> keys = redis.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception e) {
            log.warn("Failed to evict keys by pattern {}: {}", pattern, e.toString());
        }
    }
}
