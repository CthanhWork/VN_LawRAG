package com.example.socialservice.service;

import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.dto.CommentResponse;
import com.example.socialservice.dto.CommentCreateRequest;
import com.example.socialservice.enums.PostVisibility;
import com.example.socialservice.exception.CustomException;
import org.springframework.web.multipart.MultipartFile;

public interface PostService {
    PostResponse createPost(Long authorId, String content, MultipartFile[] files, PostVisibility visibility) throws CustomException;

    PageResponse<PostResponse> listMyPosts(Long userId, int page, int size) throws CustomException;

    PageResponse<PostResponse> listUserPosts(Long targetUserId, Long currentUserId, int page, int size) throws CustomException;

    // Likes
    long likePost(Long userId, Long postId) throws CustomException;
    long unlikePost(Long userId, Long postId) throws CustomException;

    // Comments
    CommentResponse addComment(Long userId, Long postId, String content) throws CustomException;
    CommentResponse updateComment(Long userId, Long postId, Long commentId, String content) throws CustomException;
    void deleteComment(Long userId, Long postId, Long commentId) throws CustomException;
    PageResponse<CommentResponse> listComments(Long postId, int page, int size) throws CustomException;

    // Visibility
    PostResponse updateVisibility(Long userId, Long postId, PostVisibility visibility) throws CustomException;

    // Public feed
    PageResponse<PostResponse> listPublicFeed(Long currentUserId, int page, int size) throws CustomException;
}
