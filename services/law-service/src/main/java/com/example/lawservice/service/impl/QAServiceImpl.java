package com.example.lawservice.service.impl;

import com.example.lawservice.clients.RagClient;
import com.example.lawservice.dto.QaAnalyzeResponse;
import com.example.lawservice.dto.QaRequest;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.exception.CustomException;
import com.example.lawservice.service.QAService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class QAServiceImpl implements QAService {
    private final RagClient ragClient;

    public QAServiceImpl(RagClient ragClient) {
        this.ragClient = ragClient;
    }

    @Override
    public QaAnalyzeResponse analyze(QaRequest req, LocalDate effectiveAt, int k) throws CustomException {
        try {
            String question = Optional.ofNullable(req)
                    .map(QaRequest::getQuestion)
                    .orElse("")
                    .trim();
            QaAnalyzeResponse raw = ragClient.analyze(question, effectiveAt, k);
            return normalize(raw);
        } catch (IllegalArgumentException ex) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, ex);
        } catch (Exception ex) {
            throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, ex);
        }
    }

    /**
     * Keep the RAG output intact (answer + citations) while ensuring null-safe fields
     * for the calling layers.
     */
    private QaAnalyzeResponse normalize(QaAnalyzeResponse raw) {
        if (raw == null) {
            return null;
        }

        String answer = Optional.ofNullable(raw.getAnswer()).orElse("").trim();
        String decision = Optional.ofNullable(raw.getDecision()).orElse("INFO");
        String explanation = Optional.ofNullable(raw.getExplanation()).orElse("").trim();
        List<QaAnalyzeResponse.Citation> citations = Optional.ofNullable(raw.getCitations())
                .map(ArrayList::new)
                .orElseGet(ArrayList::new);

        return QaAnalyzeResponse.builder()
                .answer(answer)
                .decision(decision)
                .explanation(explanation)
                .citations(citations)
                .effectiveAt(raw.getEffectiveAt())
                .build();
    }
}
