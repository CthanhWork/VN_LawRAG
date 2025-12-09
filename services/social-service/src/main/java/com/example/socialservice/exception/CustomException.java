package com.example.socialservice.exception;

import com.example.socialservice.enums.StatusCode;

public class CustomException extends Exception {
    private final StatusCode errorCode;

    public CustomException(StatusCode errorCode, Object... args) {
        super(buildMessage(errorCode, args));
        this.errorCode = errorCode;
    }

    public CustomException(StatusCode errorCode, Throwable cause, Object... args) {
        super(buildMessage(errorCode, args), cause);
        this.errorCode = errorCode;
    }

    public StatusCode getErrorCode() {
        return errorCode;
    }

    private static String buildMessage(StatusCode errorCode, Object... args) {
        String defaultMsg = errorCode.getMessage();
        if (args == null || args.length == 0) {
            return defaultMsg;
        }
        // If caller passed a single custom message and no placeholders exist, return it directly
        if (args.length == 1 && args[0] instanceof String s && !defaultMsg.contains("%")) {
            return s;
        }
        try {
            return String.format(defaultMsg, args);
        } catch (Exception ex) {
            return defaultMsg;
        }
    }
}
