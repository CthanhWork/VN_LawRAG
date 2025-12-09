package com.example.socialservice.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {
    private static final Logger log = LoggerFactory.getLogger(CloudinaryService.class);

    private final Cloudinary cloudinary;
    private final boolean enabled;
    private final String rootFolder;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret,
            @Value("${app.media.cloud.folder:vn-law}") String folder
    ) {
        this.enabled = StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
        this.rootFolder = normalizeFolder(folder);
        if (this.enabled) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret
            ));
        } else {
            this.cloudinary = null;
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public CloudinaryUploadResult upload(MultipartFile file, String nestedFolder) throws IOException {
        if (!enabled) {
            throw new IllegalStateException("Cloudinary is not configured");
        }
        String folder = buildFolder(nestedFolder);
        Map<String, Object> options = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", "auto",
                "use_filename", false,
                "unique_filename", true,
                "overwrite", true
        );
        @SuppressWarnings("unchecked")
        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), options);
        return mapResult(result, file.getContentType(), file.getSize());
    }

    public void delete(String publicId, String resourceType) {
        if (!enabled || !StringUtils.hasText(publicId)) return;
        try {
            Map<?, ?> options = StringUtils.hasText(resourceType)
                    ? ObjectUtils.asMap("resource_type", resourceType)
                    : ObjectUtils.emptyMap();
            cloudinary.uploader().destroy(publicId, options);
        } catch (Exception ex) {
            log.warn("Failed to delete Cloudinary resource {}", publicId, ex);
        }
    }

    private CloudinaryUploadResult mapResult(Map<String, Object> uploadResult, String fallbackMime, long fallbackSize) {
        Object secureUrlObj = uploadResult.get("secure_url");
        Object urlObj = uploadResult.get("url");
        String url = secureUrlObj != null ? secureUrlObj.toString() : urlObj != null ? urlObj.toString() : null;

        Object mimeObj = uploadResult.get("mime_type");
        String mimeType = mimeObj != null ? mimeObj.toString() : fallbackMime;

        Object bytesObj = uploadResult.get("bytes");
        long bytes = bytesObj instanceof Number ? ((Number) bytesObj).longValue() : fallbackSize;

        Object typeObj = uploadResult.get("resource_type");
        String resourceType = typeObj != null ? typeObj.toString() : "image";

        Object formatObj = uploadResult.get("format");
        String format = formatObj != null ? formatObj.toString() : null;

        Object publicIdObj = uploadResult.get("public_id");
        String publicId = publicIdObj != null ? publicIdObj.toString() : null;

        return new CloudinaryUploadResult(publicId, url, resourceType, format, mimeType, bytes);
    }

    private String buildFolder(String nestedFolder) {
        if (!StringUtils.hasText(nestedFolder)) return rootFolder;
        if (!StringUtils.hasText(rootFolder)) return nestedFolder;
        return rootFolder + "/" + nestedFolder;
    }

    private String normalizeFolder(String folder) {
        if (!StringUtils.hasText(folder)) return "";
        String trimmed = folder.trim();
        while (trimmed.startsWith("/")) trimmed = trimmed.substring(1);
        while (trimmed.endsWith("/")) trimmed = trimmed.substring(0, trimmed.length() - 1);
        return trimmed;
    }
}
