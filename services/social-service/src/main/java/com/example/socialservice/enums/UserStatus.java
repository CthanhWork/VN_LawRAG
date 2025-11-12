package com.example.socialservice.enums;

public enum UserStatus {
    ACTIVE, PENDING, DISABLED;

    public String value() { return name(); }
}

