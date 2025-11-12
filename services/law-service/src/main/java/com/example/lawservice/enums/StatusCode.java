package com.example.lawservice.enums;

public enum StatusCode {
    OK(200, "OK"),
    CREATED(201, "Created"),
    ACCEPTED(202, "Accepted"),

    VALIDATION_ERROR(1000, "Validation error"),
    NOT_FOUND(404, "Not Found"),
    UNAUTHORIZED(401, "Unauthorized"),
    CONFLICT(409, "Conflict"),
    INTERNAL_SERVER_ERROR(500, "Internal server error");

    private final int code;
    private final String defaultMessage;

    StatusCode(int code, String defaultMessage) {
        this.code = code;
        this.defaultMessage = defaultMessage;
    }

    public int getCode() { return code; }
    public String getMessage() { return defaultMessage; }
    public String getMessage(Object... args) {
        try { return String.format(defaultMessage, args); } catch (Exception e) { return defaultMessage; }
    }
}

