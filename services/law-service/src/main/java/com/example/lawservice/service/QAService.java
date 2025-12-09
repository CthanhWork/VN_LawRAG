package com.example.lawservice.service;

import com.example.lawservice.dto.QaAnalyzeResponse;
import com.example.lawservice.dto.QaRequest;
import com.example.lawservice.exception.CustomException;

import java.time.LocalDate;

public interface QAService {
    QaAnalyzeResponse analyze(QaRequest req, LocalDate effectiveAt, int k) throws CustomException;
}

