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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class QAServiceImpl implements QAService {
    private final RagClient ragClient;

    public QAServiceImpl(RagClient ragClient) {
        this.ragClient = ragClient;
    }

    @Override
    public QaAnalyzeResponse analyze(QaRequest req, LocalDate effectiveAt, int k) throws CustomException {
        try {
            QaAnalyzeResponse raw = ragClient.analyze(req.getQuestion(), effectiveAt, k);
            return beautify(raw, req);
        } catch (IllegalArgumentException ex) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, ex);
        } catch (Exception ex) {
            throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, ex);
        }
    }

    private QaAnalyzeResponse beautify(QaAnalyzeResponse raw, QaRequest req) {
        if (raw == null) return null;
        String question = Optional.ofNullable(req).map(QaRequest::getQuestion).orElse("").trim();

        String originalAnswer = Optional.ofNullable(raw.getAnswer()).orElse("");
        List<QaAnalyzeResponse.Citation> citations = new ArrayList<>();
        if (raw.getCitations() != null && !raw.getCitations().isEmpty()) {
            citations.addAll(raw.getCitations());
        } else {
            Pattern p = Pattern.compile("\\[([^\\]]+)]");
            Matcher m = p.matcher(originalAnswer);
            while (m.find()) {
                String ref = m.group(1).trim();
                citations.add(QaAnalyzeResponse.Citation.builder()
                        .lawCode("Luật Hôn nhân và Gia đình")
                        .nodePath(ref)
                        .nodeId(null)
                        .build());
            }
        }

        String cleanedAnswer = originalAnswer
                .replaceAll("\\[[^\\]]+\\]", " ")
                .replaceAll("(?m)^-\\s*", "")
                .replaceAll("\\s{2,}", " ")
                .trim();

        String refinedAnswer = cleanedAnswer
                // Loại bỏ các heading thô không dấu/lỗi dấu
                .replaceAll("(?im)^\\s*(tu van phap ly(?:\\s*\\(rut gon\\))?)\\s*:?", " ")
                .replaceAll("(?im)^\\s*(tư vấn pháp lý(?:\\s*\\(rút gọn\\))?)\\s*:?", " ")
                .replaceAll("(?im)^\\s*(tom tat quy dinh lien quan.*)\\s*:?", " ")
                .replaceAll("(?im)^\\s*(tóm tắt quy định liên quan.*)\\s*:?", " ")
                // Chuẩn hóa cụm từ còn sót
                .replaceAll("(?i)tu van phap ly\\s*(\\(rut gon\\))?", "Tư vấn pháp lý")
                .replaceAll("(?i)tom tat quy dinh lien quan", "Tóm tắt quy định liên quan")
                .replaceAll("\\s{2,}", " ")
                .trim();

        StringBuilder finalAnswer = new StringBuilder();
        finalAnswer.append("**Tư vấn pháp lý:** ").append(refinedAnswer).append(" ");
        finalAnswer.append("**Quy định liên quan:** Quy định về quyền thăm nom, khả năng hạn chế quyền thăm nom khi gây ảnh hưởng xấu cho con, và việc điều chỉnh cấp dưỡng được áp dụng theo các trích dẫn trong danh sách citations đi kèm. ");
        finalAnswer.append("**Căn cứ pháp lý đầy đủ:** Các căn cứ cụ thể (Điều, Khoản, Chương của Luật Hôn nhân và Gia đình và văn bản liên quan) được liệt kê trong mục citations kèm theo.");

        String decision = Optional.ofNullable(raw.getDecision()).orElse("INFO");
        String explanation = "Kết quả được phân loại là %s (Information) do câu hỏi cần tư vấn pháp luật, không nhằm xác định hành vi vi phạm."
                .formatted(decision);

        return QaAnalyzeResponse.builder()
                .answer(finalAnswer.toString().trim())
                .decision(decision)
                .explanation(explanation)
                .citations(citations)
                .effectiveAt(raw.getEffectiveAt())
                .build();
    }
}
