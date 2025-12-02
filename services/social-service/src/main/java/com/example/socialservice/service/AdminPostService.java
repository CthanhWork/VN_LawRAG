package com.example.socialservice.service;

import com.example.socialservice.dto.CommentResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.enums.PostVisibility;
import com.example.socialservice.exception.CustomException;

public interface AdminPostService {
    PageResponse<PostResponse> listPosts(Long authorId, PostVisibility visibility, int page, int size);
    PostResponse getPost(Long postId) throws CustomException;
    PostResponse updateVisibility(Long postId, PostVisibility visibility) throws CustomException;
    void deletePost(Long postId) throws CustomException;
    PageResponse<CommentResponse> listComments(Long postId, int page, int size) throws CustomException;
    void deleteComment(Long postId, Long commentId) throws CustomException;
}
