package com.example.socialservice.exception;

import com.example.socialservice.enums.StatusCode;

public class CustomException extends Exception {
    private final StatusCode errorCode;

    public CustomException(StatusCode errorCode, Object... args) {
        super(errorCode.getMessage(args));
        this.errorCode = errorCode;
    }

    public CustomException(StatusCode errorCode, Throwable cause, Object... args) {
        super(errorCode.getMessage(args), cause);
        this.errorCode = errorCode;
    }

    public StatusCode getErrorCode() {
        return errorCode;
    }
}

