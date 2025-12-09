package com.example.socialservice.dto;

public class RegisterPendingResponse {
    private boolean pending;
    private String email;
    private int expiresInSeconds;

    public RegisterPendingResponse() {}
    public RegisterPendingResponse(boolean pending, String email, int expiresInSeconds) {
        this.pending = pending;
        this.email = email;
        this.expiresInSeconds = expiresInSeconds;
    }

    public boolean isPending() { return pending; }
    public void setPending(boolean pending) { this.pending = pending; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public int getExpiresInSeconds() { return expiresInSeconds; }
    public void setExpiresInSeconds(int expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }
}

