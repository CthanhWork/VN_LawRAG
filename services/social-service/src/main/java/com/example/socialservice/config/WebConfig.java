package com.example.socialservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String uploadDir;
    private final String publicPrefix;
    private final String[] allowedOrigins;
    private final String storageType;

    public WebConfig(
            @Value("${app.media.upload-dir:uploads}") String uploadDir,
            @Value("${app.media.public-prefix:/media}") String publicPrefix,
            @Value("${app.media.storage:local}") String storageType,
            @Value("${app.cors.allowed-origins:*}") String allowedOrigins
    ) {
        this.uploadDir = uploadDir;
        this.publicPrefix = publicPrefix;
        this.allowedOrigins = parseOrigins(allowedOrigins);
        this.storageType = storageType;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!"local".equalsIgnoreCase(storageType)) {
            return;
        }
        String prefix = publicPrefix.endsWith("/") ? publicPrefix : publicPrefix + "/";
        String pattern = prefix + "**";
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = root.toUri().toString(); // file:///...
        registry.addResourceHandler(pattern)
                .addResourceLocations(location);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .exposedHeaders("Content-Type", "Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }

    private String[] parseOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            return new String[]{"*"};
        }
        return origins.split("\\s*,\\s*");
    }
}
