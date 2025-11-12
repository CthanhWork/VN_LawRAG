package com.example.socialservice.service;

import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.exception.CustomException;
import org.springframework.web.multipart.MultipartFile;

public interface PostService {
    PostResponse createPost(Long authorId, String content, MultipartFile[] files) throws CustomException;
}

