package com.example.socialservice.config;

import com.example.socialservice.filter.RequestResponseLoggingFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

@Configuration
public class HttpLoggingConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.logging.http", name = "enabled", havingValue = "true")
    public FilterRegistrationBean<RequestResponseLoggingFilter> requestResponseLoggingFilter(
            @Value("${app.logging.http.max-payload:4096}") int maxPayload,
            @Value("${app.logging.http.log-headers:true}") boolean logHeaders
    ) {
        RequestResponseLoggingFilter filter = new RequestResponseLoggingFilter(maxPayload, logHeaders);
        FilterRegistrationBean<RequestResponseLoggingFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        return reg;
    }
}

