package com.example.lawservice.clients;

import com.example.lawservice.dto.QaResponse;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import com.example.lawservice.dto.QaGenResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class RagClient {
    private static final Logger log = LoggerFactory.getLogger(RagClient.class);
    private static final String QA_PATH = "/qa";
    private static final String GEN_PATH = "/gen";
    private static final String ANALYZE_PATH = "/analyze";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(90);

    private final WebClient webClient;
    private final LawNodeRepository lawNodeRepository;

    @Autowired
    public RagClient(LawNodeRepository lawNodeRepository, WebClient webClient) {
        this.webClient = webClient; // Configured in WebConfig with baseUrl
        this.lawNodeRepository = lawNodeRepository;
    }

    public QaResponse ask(String question, LocalDate effectiveAt) {
        return ask(question, effectiveAt, false);
    }

    public QaResponse ask(String question, LocalDate effectiveAt, boolean useReranker) {
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("question must not be blank");
        }

        LocalDate effectiveDate = Optional.ofNullable(effectiveAt).orElse(LocalDate.now());

        try {
            RagServiceResponse response = webClient.post()
                .uri(QA_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new RagServiceRequest(question, effectiveDate.toString(), useReranker))
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), clientResponse ->
                    clientResponse.bodyToMono(String.class).map(body ->
                        new RuntimeException("RAG service error (" + clientResponse.statusCode() + "): " + body)
                    )
                )
                .bodyToMono(RagServiceResponse.class)
                .block(REQUEST_TIMEOUT);

            if (response == null) {
                throw new RuntimeException("Empty response from RAG service");
            }

            List<QaResponse.LegalContext> context = Optional.ofNullable(response.context)
                .orElseGet(Collections::emptyList)
                .stream()
                .map(ctx -> {
                    Long nodeId = ctx.nodeId;

                    LawNode node = null;
                    if (nodeId != null) {
                        node = lawNodeRepository.findById(nodeId).orElse(null);
                    }

                    return QaResponse.LegalContext.builder()
                        .content(ctx.content)
                        .lawCode(ctx.lawCode)
                        .nodePath(ctx.nodePath)
                        .nodeId(nodeId)
                        .effectiveStart(node != null ? node.getEffectiveStart() : null)
                        .effectiveEnd(node != null ? node.getEffectiveEnd() : null)
                        .build();
                })
                .collect(Collectors.toList());

            return QaResponse.builder()
                .answer(response.answer)
                .context(context)
                .effectiveAt(effectiveDate)
                .build();
        } catch (WebClientResponseException e) {
            log.error("RAG service HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            log.error("RAG service call failed", e);
            throw new RuntimeException("Failed to call RAG service", e);
        }
    }

    public QaGenResponse generate(String question, LocalDate effectiveAt, Integer k, Integer maxTokens, Double temperature) {
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("question must not be blank");
        }
        LocalDate effectiveDate = Optional.ofNullable(effectiveAt).orElse(LocalDate.now());
        try {
            RagGenResponse resp = webClient.post()
                .uri(GEN_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new RagGenRequest(question, effectiveDate.toString(), k, maxTokens, temperature))
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), clientResponse ->
                    clientResponse.bodyToMono(String.class).map(body ->
                        new RuntimeException("RAG /gen error (" + clientResponse.statusCode() + "): " + body)
                    )
                )
                .bodyToMono(RagGenResponse.class)
                .block(REQUEST_TIMEOUT);

            if (resp == null) {
                throw new RuntimeException("Empty response from RAG /gen");
            }

            java.util.List<QaGenResponse.Citation> citations = Optional.ofNullable(resp.citations)
                .orElseGet(Collections::emptyList)
                .stream()
                .map(c -> QaGenResponse.Citation.builder()
                    .lawCode(c.lawCode)
                    .nodePath(c.nodePath)
                    .nodeId(c.nodeId)
                    .build())
                .collect(java.util.stream.Collectors.toList());

            java.util.List<Long> usedNodes = Optional.ofNullable(resp.usedNodes)
                .orElseGet(Collections::emptyList);

            return com.example.lawservice.dto.QaGenResponse.builder()
                .answer(resp.answer)
                .citations(citations)
                .effectiveAt(effectiveDate)
                .usedNodes(usedNodes)
                .build();
        } catch (WebClientResponseException e) {
            log.error("RAG /gen HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            log.error("RAG /gen call failed", e);
            throw new RuntimeException("Failed to call RAG /gen", e);
        }
    }

    public com.example.lawservice.dto.QaAnalyzeResponse analyze(String question, LocalDate effectiveAt, Integer k) {
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("question must not be blank");
        }
        LocalDate effectiveDate = Optional.ofNullable(effectiveAt).orElse(LocalDate.now());
        int topK = Optional.ofNullable(k).orElse(10);
        try {
            AnalyzeRequest payload = new AnalyzeRequest(question, effectiveDate.toString(), new AnalyzeOptions(topK));
            AnalyzeResult resp = webClient.post()
                .uri(ANALYZE_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), clientResponse ->
                    clientResponse.bodyToMono(String.class).map(body ->
                        new RuntimeException("RAG /analyze error (" + clientResponse.statusCode() + "): " + body)
                    )
                )
                .bodyToMono(AnalyzeResult.class)
                .block(REQUEST_TIMEOUT);

            if (resp == null) {
                throw new RuntimeException("Empty response from RAG /analyze");
            }

            java.util.List<com.example.lawservice.dto.QaAnalyzeResponse.Citation> citations = Optional.ofNullable(resp.citations)
                .orElseGet(Collections::emptyList)
                .stream()
                .map(c -> com.example.lawservice.dto.QaAnalyzeResponse.Citation.builder()
                    .lawCode(c.lawCode)
                    .nodePath(c.nodePath)
                    .nodeId(c.nodeId)
                    .build())
                .collect(java.util.stream.Collectors.toList());

            return com.example.lawservice.dto.QaAnalyzeResponse.builder()
                .answer(resp.answer)
                .decision(resp.decision)
                .explanation(resp.explanation)
                .citations(citations)
                .effectiveAt(effectiveDate)
                .build();
        } catch (WebClientResponseException e) {
            log.error("RAG /analyze HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw e;
        } catch (Exception e) {
            log.error("RAG /analyze call failed", e);
            throw new RuntimeException("Failed to call RAG /analyze", e);
        }
    }

    // Request/Response DTOs for the RAG service
    private record RagServiceRequest(
        @JsonProperty("question") String question,
        @JsonProperty("effective_at") String effectiveAt,
        @JsonProperty("use_reranker") boolean useReranker
    ) {}

    private static class RagServiceResponse {
        @JsonProperty("answer")
        @JsonAlias("answer")
        public String answer;

        @JsonProperty("context")
        @JsonAlias("context")
        public List<ContextItem> context;
    }

    private static class ContextItem {
        @JsonProperty("content")
        @JsonAlias("content")
        public String content;

        @JsonProperty("law_code")
        @JsonAlias("lawCode")
        public String lawCode;

        @JsonProperty("node_path")
        @JsonAlias("nodePath")
        public String nodePath;

        @JsonProperty("node_id")
        @JsonAlias("nodeId")
        public Long nodeId;
    }

    // DTOs for /gen
    private record RagGenRequest(
        @JsonProperty("question") String question,
        @JsonProperty("effective_at") String effectiveAt,
        @JsonProperty("k") Integer k,
        @JsonProperty("max_tokens") Integer maxTokens,
        @JsonProperty("temperature") Double temperature
    ) {}

    private static class RagGenResponse {
        @JsonProperty("answer")
        @JsonAlias("answer")
        public String answer;

        @JsonProperty("citations")
        @JsonAlias("citations")
        public java.util.List<RagCitation> citations;

        @JsonProperty("used_nodes")
        @JsonAlias("usedNodes")
        public java.util.List<Long> usedNodes;
    }

    // DTOs for /analyze
    private record AnalyzeRequest(
        @JsonProperty("question") String question,
        @JsonProperty("effective_at") String effectiveAt,
        @JsonProperty("options") AnalyzeOptions options
    ) {}

    private record AnalyzeOptions(
        @JsonProperty("k") int k
    ) {}

    private static class AnalyzeResult {
        @JsonProperty("answer")
        @JsonAlias("answer")
        public String answer;

        @JsonProperty("decision")
        public String decision;

        @JsonProperty("explanation")
        public String explanation;

        @JsonProperty("citations")
        public java.util.List<RagCitation> citations;
    }

    private static class RagCitation {
        @JsonProperty("law_code")
        @JsonAlias("lawCode")
        public String lawCode;

        @JsonProperty("node_path")
        @JsonAlias("nodePath")
        public String nodePath;

        @JsonProperty("node_id")
        @JsonAlias("nodeId")
        public Long nodeId;
    }

    public void reindex() {
        try {
            webClient.post()
                .uri("/admin/reindex")
                .retrieve()
                .toBodilessEntity()
                .block(REQUEST_TIMEOUT);
        } catch (Exception e) {
            log.error("Failed to trigger RAG reindex", e);
            throw new RuntimeException("RAG reindex failed", e);
        }
    }
}
