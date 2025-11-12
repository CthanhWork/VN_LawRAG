package com.example.lawservice.controller;

import com.example.lawservice.dto.SuggestionDTO;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.payload.ApiResponse;
import com.example.lawservice.service.SuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
@Tag(name = "Suggestions", description = "Auto-complete suggestions for laws and nodes")
public class SuggestionController {

    private final SuggestionService suggestionService;

    @GetMapping
    @Operation(summary = "Get auto-complete suggestions based on keyword")
    public ResponseEntity<ApiResponse<List<SuggestionDTO>>> getSuggestions(@RequestParam String keyword) {
        List<SuggestionDTO> data = suggestionService.getSuggestions(keyword);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), data));
    }
}
