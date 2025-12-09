package com.example.lawservice.controller;

import com.example.lawservice.clients.RagClient;
import com.example.lawservice.dto.LawUploadRequest;
import com.example.lawservice.dto.LawUploadResponse;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.exception.CustomException;
import com.example.lawservice.payload.ApiResponse;
import com.example.lawservice.service.LawUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Administrative operations (internal)")
public class AdminController {
    private final RagClient ragClient;
    private final LawUploadService lawUploadService;

    public AdminController(RagClient ragClient, LawUploadService lawUploadService) {
        this.ragClient = ragClient;
        this.lawUploadService = lawUploadService;
    }

    @PostMapping("/reindex")
    @Operation(summary = "Trigger RAG re-embedding after data changes")
    public ResponseEntity<ApiResponse<Void>> reindex() {
        ragClient.reindex();
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.of(StatusCode.ACCEPTED.getCode(), StatusCode.ACCEPTED.getMessage(), null));
    }

    @PostMapping(path = "/laws/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new law PDF and import its content as a single node")
    public ResponseEntity<ApiResponse<LawUploadResponse>> uploadLawPdf(
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("meta") LawUploadRequest request
    ) throws CustomException {
        LawUploadResponse result = lawUploadService.upload(file, request);
        boolean created = Boolean.TRUE.equals(result.getCreated());
        StatusCode code = created ? StatusCode.CREATED : StatusCode.OK;
        HttpStatus status = created ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status)
                .body(ApiResponse.of(code.getCode(), code.getMessage(), result));
    }
}
