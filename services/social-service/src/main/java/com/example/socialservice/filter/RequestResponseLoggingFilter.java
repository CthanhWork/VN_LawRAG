package com.example.socialservice.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

public class RequestResponseLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger("HTTP");

    private final int maxPayload;
    private final boolean logHeaders;

    public RequestResponseLoggingFilter(int maxPayload, boolean logHeaders) {
        this.maxPayload = Math.max(0, maxPayload);
        this.logHeaders = logHeaders;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        ContentCachingRequestWrapper req = new ContentCachingRequestWrapper(request, Math.max(1024, maxPayload));
        ContentCachingResponseWrapper res = new ContentCachingResponseWrapper(response);

        Instant start = Instant.now();
        try {
            filterChain.doFilter(req, res);
        } finally {
            Instant end = Instant.now();
            long tookMs = Duration.between(start, end).toMillis();
            try {
                logRequest(req);
                logResponse(req, res, tookMs);
            } catch (Exception e) {
                log.warn("HTTP log error: {}", e.toString());
            } finally {
                res.copyBodyToResponse();
            }
        }
    }

    private void logRequest(ContentCachingRequestWrapper req) {
        String method = req.getMethod();
        String uri = req.getRequestURI();
        String query = req.getQueryString();
        String full = uri + (query != null ? ("?" + query) : "");
        String ct = req.getContentType();

        StringBuilder sb = new StringBuilder();
        sb.append("--> ").append(method).append(' ').append(full);
        if (ct != null) sb.append(" | CT=").append(ct);

        if (logHeaders) sb.append(" | headers=").append(maskHeaders(Collections.list(req.getHeaderNames()), req));

        // Skip large/binary bodies; log only text-like up to maxPayload
        if (isTextLike(ct) && maxPayload > 0) {
            String body = getBodyAsString(req.getContentAsByteArray());
            if (StringUtils.hasText(body)) {
                sb.append(" | body=").append(truncate(body));
            }
        } else if (isMultipart(ct)) {
            sb.append(" | body=multipart");
        }

        log.info(sb.toString());
    }

    private void logResponse(ContentCachingRequestWrapper req, ContentCachingResponseWrapper res, long tookMs) {
        String ct = res.getContentType();
        int status = res.getStatus();
        int length = res.getContentSize();

        StringBuilder sb = new StringBuilder();
        sb.append("<-- ").append(req.getMethod()).append(' ').append(req.getRequestURI());
        sb.append(" | status=").append(status);
        sb.append(" | time=").append(tookMs).append("ms");
        sb.append(" | len=").append(length);
        if (ct != null) sb.append(" | CT=").append(ct);

        if (isTextLike(ct) && maxPayload > 0) {
            String body = getBodyAsString(res.getContentAsByteArray());
            if (StringUtils.hasText(body)) {
                sb.append(" | body=").append(truncate(body));
            }
        }

        log.info(sb.toString());
    }

    private String maskHeaders(List<String> names, HttpServletRequest req) {
        Map<String, String> m = new LinkedHashMap<>();
        for (String n : names) {
            String v = Collections.list(req.getHeaders(n)).toString();
            if ("authorization".equalsIgnoreCase(n)) v = "[masked]";
            if ("cookie".equalsIgnoreCase(n)) v = "[masked]";
            m.put(n, v);
        }
        return m.toString();
    }

    private boolean isMultipart(String ct) {
        return ct != null && ct.toLowerCase(Locale.ROOT).startsWith(MediaType.MULTIPART_FORM_DATA_VALUE);
    }

    private boolean isTextLike(String ct) {
        if (ct == null) return false;
        String lower = ct.toLowerCase(Locale.ROOT);
        return lower.contains("json")
                || lower.startsWith("text/")
                || lower.contains("xml")
                || lower.contains(MimeTypeUtils.APPLICATION_FORM_URLENCODED_VALUE);
    }

    private String getBodyAsString(byte[] buf) {
        if (buf == null || buf.length == 0) return null;
        try {
            return new String(buf, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "[binary]";
        }
    }

    private String truncate(String s) {
        if (s == null) return null;
        if (s.length() <= maxPayload) return s;
        return s.substring(0, maxPayload) + "...";
    }
}

