package com.example.socialservice.exception;

import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.payload.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<String>> handleCustomException(CustomException ex) {
        log.error("CustomException: {}", ex.getMessage());
        ApiResponse<String> body = ApiResponse.of(ex.getErrorCode().getCode(), ex.getMessage(), null);
        HttpStatus status = mapStatus(ex.getErrorCode());
        return new ResponseEntity<>(body, status);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        log.info("Validation error: {}", ex.getMessage());
        ApiResponse<Void> body = ApiResponse.of(StatusCode.VALIDATION_ERROR.getCode(),
                StatusCode.VALIDATION_ERROR.getMessage(), null);
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(DataIntegrityViolationException ex) {
        log.info("Data integrity violation: {}", ex.getMessage());
        // Likely unique email constraint
        ApiResponse<Void> body = ApiResponse.of(StatusCode.EMAIL_TAKEN.getCode(),
                StatusCode.EMAIL_TAKEN.getMessage(), null);
        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        ApiResponse<Void> body = ApiResponse.of(StatusCode.INTERNAL_SERVER_ERROR.getCode(),
                StatusCode.INTERNAL_SERVER_ERROR.getMessage(), null);
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private HttpStatus mapStatus(StatusCode code) {
        return switch (code) {
            case OK -> HttpStatus.OK;
            case CREATED -> HttpStatus.CREATED;
            case ACCEPTED -> HttpStatus.ACCEPTED;
            case BAD_REQUEST -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case CONFLICT -> HttpStatus.CONFLICT;
            case VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
