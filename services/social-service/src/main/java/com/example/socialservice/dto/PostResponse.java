package com.example.socialservice.dto;

import java.time.OffsetDateTime;
import java.util.List;

public class PostResponse {
    private Long id;
    private Long authorId;
    private String content;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<PostMediaResponse> media;
    private long likeCount;
    private long commentCount;
    private boolean likedByCurrentUser;

    public PostResponse() {}

    public PostResponse(Long id, Long authorId, String content, OffsetDateTime createdAt, OffsetDateTime updatedAt, List<PostMediaResponse> media) {
        this.id = id;
        this.authorId = authorId;
        this.content = content;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.media = media;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<PostMediaResponse> getMedia() { return media; }
    public void setMedia(List<PostMediaResponse> media) { this.media = media; }
    public long getLikeCount() { return likeCount; }
    public void setLikeCount(long likeCount) { this.likeCount = likeCount; }
    public long getCommentCount() { return commentCount; }
    public void setCommentCount(long commentCount) { this.commentCount = commentCount; }
    public boolean isLikedByCurrentUser() { return likedByCurrentUser; }
    public void setLikedByCurrentUser(boolean likedByCurrentUser) { this.likedByCurrentUser = likedByCurrentUser; }
}
