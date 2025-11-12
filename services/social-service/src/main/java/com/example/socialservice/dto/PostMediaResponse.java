package com.example.socialservice.dto;

import com.example.socialservice.enums.MediaType;

public class PostMediaResponse {
    private Long id;
    private MediaType mediaType;
    private String url;
    private String mimeType;
    private Long sizeBytes;

    public PostMediaResponse() {}

    public PostMediaResponse(Long id, MediaType mediaType, String url, String mimeType, Long sizeBytes) {
        this.id = id;
        this.mediaType = mediaType;
        this.url = url;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MediaType getMediaType() { return mediaType; }
    public void setMediaType(MediaType mediaType) { this.mediaType = mediaType; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
}

