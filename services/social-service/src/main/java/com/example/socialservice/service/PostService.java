package com.example.socialservice.service;

import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.exception.CustomException;
import org.springframework.web.multipart.MultipartFile;

public interface PostService {
    PostResponse createPost(Long authorId, String content, MultipartFile[] files) throws CustomException;

    PageResponse<PostResponse> listMyPosts(Long userId, int page, int size) throws CustomException;

    PageResponse<PostResponse> listUserPosts(Long targetUserId, Long currentUserId, int page, int size) throws CustomException;
}
