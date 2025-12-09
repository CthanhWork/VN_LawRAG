package com.example.lawservice.payload;

import io.swagger.v3.oas.annotations.media.Schema;

public class ApiResponse<T> {
    @Schema(description = "Business status code", example = "200")
    private int code;

    @Schema(description = "Human-readable message", example = "OK")
    private String message;

    @Schema(description = "Payload")
    private T data;

    public ApiResponse() {}

    public ApiResponse(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> of(int code, String message, T data) {
        return new ApiResponse<>(code, message, data);
    }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public T getData() { return data; }
    public void setData(T data) { this.data = data; }
}
