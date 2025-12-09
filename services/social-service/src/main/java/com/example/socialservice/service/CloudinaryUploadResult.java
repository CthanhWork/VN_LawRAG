package com.example.socialservice.service;

public record CloudinaryUploadResult(
        String publicId,
        String url,
        String resourceType,
        String format,
        String mimeType,
        Long bytes
) {
}
