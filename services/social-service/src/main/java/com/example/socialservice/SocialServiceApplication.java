package com.example.socialservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class SocialServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(SocialServiceApplication.class, args);
    }
}
