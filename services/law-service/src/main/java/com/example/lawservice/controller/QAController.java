    package com.example.lawservice.controller;

    import com.example.lawservice.dto.QaAnalyzeResponse;
    import com.example.lawservice.dto.QaRequest;
    import com.example.lawservice.enums.StatusCode;
    import com.example.lawservice.exception.CustomException;
    import com.example.lawservice.payload.ApiResponse;
    import com.example.lawservice.service.QAService;
    import io.swagger.v3.oas.annotations.Operation;
    import io.swagger.v3.oas.annotations.Parameter;
    import io.swagger.v3.oas.annotations.tags.Tag;
    import org.springframework.format.annotation.DateTimeFormat;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.*;

    import java.time.LocalDate;

    @RestController
    @RequestMapping("/api/qa")
    @Tag(name = "QA", description = "LLM analyze endpoint (standardized)")
    public class QAController {

        private final QAService qaService;

        public QAController(QAService qaService) {
            this.qaService = qaService;
        }

    @PostMapping(value = "/analyze", consumes = "application/json")
    @Operation(summary = "Analyze a scenario using LLM and return decision with citations")
    public ResponseEntity<ApiResponse<QaAnalyzeResponse>> analyze(
        @RequestBody QaRequest body,
        @Parameter(description = "Effective date (YYYY-MM-DD)")
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate effectiveAt
    ) throws CustomException {
        final int k = 10; // fixed default; no need to pass from client
        QaAnalyzeResponse result = qaService.analyze(body, effectiveAt, k);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), result));
    }
}
