package com.example.lawservice.exception;

import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.payload.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import jakarta.persistence.EntityNotFoundException;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Void>> handleCustom(CustomException ex) {
        log.error("CustomException: {}", ex.getMessage());
        HttpStatus status = mapStatus(ex.getErrorCode());
        return new ResponseEntity<>(ApiResponse.of(ex.getErrorCode().getCode(), ex.getMessage(), null), status);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        log.info("Validation error: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.of(StatusCode.VALIDATION_ERROR.getCode(),
                StatusCode.VALIDATION_ERROR.getMessage(), null), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException ex) {
        log.info("Entity not found: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.of(StatusCode.NOT_FOUND.getCode(), StatusCode.NOT_FOUND.getMessage(), null),
                HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.info("Illegal argument: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.of(StatusCode.VALIDATION_ERROR.getCode(), ex.getMessage(), null),
                HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAll(Exception ex) {
        log.error("Unexpected error", ex);
        return new ResponseEntity<>(ApiResponse.of(StatusCode.INTERNAL_SERVER_ERROR.getCode(),
                StatusCode.INTERNAL_SERVER_ERROR.getMessage(), null), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private HttpStatus mapStatus(StatusCode code) {
        return switch (code) {
            case OK -> HttpStatus.OK;
            case CREATED -> HttpStatus.CREATED;
            case ACCEPTED -> HttpStatus.ACCEPTED;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case CONFLICT -> HttpStatus.CONFLICT;
            case VALIDATION_ERROR -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
