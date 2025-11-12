package com.example.lawservice.service.impl;

import com.example.lawservice.clients.RagClient;
import com.example.lawservice.dto.QaAnalyzeResponse;
import com.example.lawservice.dto.QaRequest;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.exception.CustomException;
import com.example.lawservice.service.QAService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class QAServiceImpl implements QAService {
    private final RagClient ragClient;

    public QAServiceImpl(RagClient ragClient) {
        this.ragClient = ragClient;
    }

    @Override
    public QaAnalyzeResponse analyze(QaRequest req, LocalDate effectiveAt, int k) throws CustomException {
        try {
            return ragClient.analyze(req.getQuestion(), effectiveAt, k);
        } catch (IllegalArgumentException ex) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, ex);
        } catch (Exception ex) {
            throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, ex);
        }
    }
}

