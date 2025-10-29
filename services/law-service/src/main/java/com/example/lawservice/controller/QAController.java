    package com.example.lawservice.controller;

    import com.example.lawservice.clients.RagClient;
    import com.example.lawservice.dto.QaGenRequest;
    import com.example.lawservice.dto.QaGenResponse;
    import com.example.lawservice.dto.QaRequest;
    import com.example.lawservice.dto.QaResponse;
    import io.swagger.v3.oas.annotations.Operation;
    import io.swagger.v3.oas.annotations.Parameter;
    import io.swagger.v3.oas.annotations.tags.Tag;
    import org.springframework.format.annotation.DateTimeFormat;
    import org.springframework.http.MediaType;
    import org.springframework.web.bind.annotation.*;

    import java.time.LocalDate;

    @RestController
    @RequestMapping("/api/qa")
    @Tag(name = "QA", description = "Question Answering endpoints")
    public class QAController {

        private final RagClient ragClient;

        public QAController(RagClient ragClient) {
            this.ragClient = ragClient;
        }

        // Backward compatibility: accept text/plain body with the question string
        @PostMapping(consumes = MediaType.TEXT_PLAIN_VALUE)
        @Operation(summary = "Ask a question (text/plain body)")
        public QaResponse askText(
            @RequestBody String question,
            @Parameter(description = "Filter responses for laws effective at this date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt
        ) {
            return ragClient.ask(question, effectiveAt);
        }

        // Preferred: accept JSON body {"question":"..."}
        @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Ask a question (JSON body)")
        public QaResponse askJson(
            @RequestBody QaRequest body,
            @Parameter(description = "Filter responses for laws effective at this date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt
        ) {
            return ragClient.ask(body.getQuestion(), effectiveAt);
        }

        @PostMapping(value = "/rerank", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Rerank search results for better relevance")
        public QaResponse rerank(
            @RequestBody QaRequest body,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt,
            @RequestParam(defaultValue = "false") boolean useReranker
        ) {
            return ragClient.ask(body.getQuestion(), effectiveAt, useReranker);
        }

        @PostMapping(value = "/gen", consumes = MediaType.APPLICATION_JSON_VALUE)
        @Operation(summary = "Generate an answer via LLM with citations (RAG)")
        public QaGenResponse generate(@RequestBody QaGenRequest body) {
            return ragClient.generate(
                body.getQuestion(),
                body.getEffectiveAt(),
                body.getK(),
                body.getMaxTokens(),
                body.getTemperature()
            );
        }
    }
