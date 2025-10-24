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
    private static final int MAX_SUGGESTIONS = 5;

    public List<SuggestionDTO> getSuggestions(String keyword) {
        return lawRepository.findSuggestions(keyword, MAX_SUGGESTIONS).stream()
            .map(law -> SuggestionDTO.builder()
                .id(law.getId())
                .type("LAW")
                .text(law.getTitle())
                .code(law.getCode())
                .build())
            .collect(Collectors.toList());
    }
}