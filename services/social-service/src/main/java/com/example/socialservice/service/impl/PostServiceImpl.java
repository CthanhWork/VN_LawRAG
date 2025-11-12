package com.example.socialservice.service.impl;

import com.example.socialservice.dto.PostMediaResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.enums.MediaType;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.Post;
import com.example.socialservice.model.PostMedia;
import com.example.socialservice.model.User;
import com.example.socialservice.repository.PostMediaRepository;
import com.example.socialservice.repository.PostRepository;
import com.example.socialservice.repository.UserRepository;
import com.example.socialservice.service.PostService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class PostServiceImpl implements PostService {
    private static final Logger log = LoggerFactory.getLogger(PostServiceImpl.class);

    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
    private final UserRepository userRepository;

    private final Path uploadRoot;
    private final String publicPrefix;

    public PostServiceImpl(PostRepository postRepository,
                           PostMediaRepository postMediaRepository,
                           UserRepository userRepository,
                           @Value("${app.media.upload-dir:uploads}") String uploadDir,
                           @Value("${app.media.public-prefix:/media}") String publicPrefix) throws IOException {
        this.postRepository = postRepository;
        this.postMediaRepository = postMediaRepository;
        this.userRepository = userRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicPrefix = publicPrefix.endsWith("/") ? publicPrefix.substring(0, publicPrefix.length()-1) : publicPrefix;
        Files.createDirectories(this.uploadRoot);
    }

    @Override
    @Transactional
    public PostResponse createPost(Long authorId, String content, MultipartFile[] files) throws CustomException {
        if (authorId == null) throw new CustomException(StatusCode.VALIDATION_ERROR, "Missing authorId");
        User author = userRepository.findById(authorId).orElse(null);
        if (author == null) throw new CustomException(StatusCode.USER_NOT_FOUND);

        Post post = new Post();
        post.setAuthorId(authorId);
        post.setContent(content);
        post = postRepository.save(post);

        List<PostMediaResponse> mediaResponses = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;
                String contentType = file.getContentType();
                MediaType mediaType = determineMediaType(contentType, file.getOriginalFilename());
                if (mediaType == null) {
                    throw new CustomException(StatusCode.VALIDATION_ERROR, "Unsupported file type");
                }

                String ext = getFileExtension(contentType, file.getOriginalFilename());
                String filename = UUID.randomUUID().toString().replaceAll("-", "") + (StringUtils.hasText(ext) ? "." + ext : "");
                LocalDate today = LocalDate.now();
                Path destDir = uploadRoot.resolve(Paths.get(String.valueOf(today.getYear()), String.format(Locale.ROOT, "%02d", today.getMonthValue()), String.format(Locale.ROOT, "%02d", today.getDayOfMonth()), String.valueOf(post.getId())));
                try {
                    Files.createDirectories(destDir);
                    Path dest = destDir.resolve(filename);
                    file.transferTo(dest.toFile());
                    String publicUrl = String.format("%s/%s/%02d/%02d/%d/%s", publicPrefix, today.getYear(), today.getMonthValue(), today.getDayOfMonth(), post.getId(), filename);

                    PostMedia pm = new PostMedia();
                    pm.setPost(post);
                    pm.setMediaType(mediaType);
                    pm.setUrl(publicUrl);
                    pm.setMimeType(contentType);
                    pm.setSizeBytes(file.getSize());
                    postMediaRepository.save(pm);

                    mediaResponses.add(new PostMediaResponse(pm.getId(), pm.getMediaType(), pm.getUrl(), pm.getMimeType(), pm.getSizeBytes()));
                } catch (IOException e) {
                    log.error("Failed to store file", e);
                    throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, e);
                }
            }
        }

        return new PostResponse(post.getId(), post.getAuthorId(), post.getContent(), post.getCreatedAt(), post.getUpdatedAt(), mediaResponses);
    }

    private MediaType determineMediaType(String contentType, String filename) {
        if (contentType != null) {
            if (contentType.startsWith("image/")) return MediaType.IMAGE;
            if (contentType.startsWith("video/")) return MediaType.VIDEO;
        }
        String ext = getExtensionFromFilename(filename).toLowerCase(Locale.ROOT);
        if (ext.matches("jpg|jpeg|png|gif|webp|bmp")) return MediaType.IMAGE;
        if (ext.matches("mp4|mov|m4v|webm|avi|mkv")) return MediaType.VIDEO;
        return null;
    }

    private String getFileExtension(String contentType, String filename) {
        String ext = getExtensionFromFilename(filename);
        if (StringUtils.hasText(ext)) return ext.toLowerCase(Locale.ROOT);
        if (contentType == null) return null;
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            case "video/mp4" -> "mp4";
            case "video/quicktime" -> "mov";
            case "video/webm" -> "webm";
            default -> null;
        };
    }

    private String getExtensionFromFilename(String filename) {
        if (!StringUtils.hasText(filename)) return "";
        int idx = filename.lastIndexOf('.');
        if (idx < 0 || idx == filename.length() - 1) return "";
        return filename.substring(idx + 1);
    }
}
