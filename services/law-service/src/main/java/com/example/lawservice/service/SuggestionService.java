package com.example.lawservice.service;

import com.example.lawservice.dto.SuggestionDTO;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.repository.LawRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuggestionService {

    private final LawRepository lawRepository;
    private final LawNodeRepository nodeRepository;
    private static final int DEFAULT_MAX_SUGGESTIONS = 5;

    public List<SuggestionDTO> getSuggestions(String keyword) {
        return getSuggestions(keyword, DEFAULT_MAX_SUGGESTIONS);
    }

    public List<SuggestionDTO> getSuggestions(String keyword, int limit) {
        int capped = Math.max(1, Math.min(limit, 50));
        return lawRepository.findSuggestions(keyword, capped).stream()
            .map(law -> SuggestionDTO.builder()
                .id(law.getId())
                .type("LAW")
                .text(law.getTitle())
                .code(law.getCode())
                .build())
            .collect(Collectors.toList());
    }
}
