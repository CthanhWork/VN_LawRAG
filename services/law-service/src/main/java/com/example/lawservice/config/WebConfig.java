package com.example.lawservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${rag.service.url:http://localhost:5001}")
    private String ragBaseUrl;

    @Value("${cors.allowed-origins:*}")
    private String corsAllowedOrigins;

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder().baseUrl(ragBaseUrl);
    }

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder.build();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] allowedOrigins = parseOrigins(corsAllowedOrigins);
        registry.addMapping("/api/**")
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
