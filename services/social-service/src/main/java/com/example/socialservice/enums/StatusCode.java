package com.example.socialservice.enums;

public enum StatusCode {
    // 1. Success (2xx)
    OK(200, "OK"),
    CREATED(201, "Created"),
    ACCEPTED(202, "Accepted"),

    // 2. Common HTTP Errors (4xx, 5xx)
    BAD_REQUEST(400, "Bad Request"),
    UNAUTHORIZED(401, "Unauthorized"),
    FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Not Found"),
    CONFLICT(409, "Conflict"),
    INTERNAL_SERVER_ERROR(500, "Internal server error"),

    // 3. Generic Business Errors (1xxx)
    VALIDATION_ERROR(1000, "Validation error"),

    // 4. User/Auth Errors (200x)
    EMAIL_TAKEN(2001, "Email already in use"),
    USER_NOT_FOUND(2002, "User not found"),
    USER_ALREADY_ACTIVE(2003, "User already active"),
    USER_NOT_ACTIVE(2004, "User not yet active"),
    INVALID_CREDENTIALS(2005, "Invalid credentials"),
    USER_PENDING(2006, "User registration pending verification"),
    PASSWORD_WEAK(2007, "Password too weak"),

    // 5. OTP Errors (210x)
    OTP_NOT_FOUND(2101, "OTP not found"),
    OTP_CONSUMED(2102, "OTP already consumed"),
    OTP_TOO_MANY_ATTEMPTS(2103, "OTP too many attempts"),
    OTP_INVALID(2104, "OTP invalid"),
    OTP_EXPIRED(2105, "OTP has expired");

    private final int code;
    private final String defaultMessage;

    StatusCode(int code, String defaultMessage) {
        this.code = code;
        this.defaultMessage = defaultMessage;
    }

    public int getCode() { return code; }
    public String getMessage() { return defaultMessage; }
    public String getMessage(Object... args) {
        try {
            return String.format(defaultMessage, args);
        } catch (Exception ex) {
            return defaultMessage;
        }
    }
}
