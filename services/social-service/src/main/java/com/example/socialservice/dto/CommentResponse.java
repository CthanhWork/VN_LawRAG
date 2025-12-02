package com.example.socialservice.dto;

import java.io.Serializable;
import java.time.OffsetDateTime;

public class CommentResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private Long postId;
    private Long authorId;
    private String content;
    private OffsetDateTime createdAt;

    public CommentResponse() {}

    public CommentResponse(Long id, Long postId, Long authorId, String content, OffsetDateTime createdAt) {
        this.id = id;
        this.postId = postId;
        this.authorId = authorId;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPostId() { return postId; }
    public void setPostId(Long postId) { this.postId = postId; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
