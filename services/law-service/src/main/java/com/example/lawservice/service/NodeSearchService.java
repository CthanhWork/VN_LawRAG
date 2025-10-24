package com.example.lawservice.service;

import com.example.lawservice.dto.NodeSearchDTO;
import com.example.lawservice.dto.PageResponse;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NodeSearchService {
    private static final int SNIPPET_HALF = 100; // total ~200 chars around match
    private final LawNodeRepository nodeRepository;

    public PageResponse<NodeSearchDTO> fulltext(String q, Pageable pageable) {
        Page<LawNode> page = nodeRepository.fulltext(q, pageable);
        Page<NodeSearchDTO> mapped = page.map(node -> NodeSearchDTO.builder()
            .id(node.getId())
            .lawId(node.getLaw() != null ? node.getLaw().getId() : null)
            .level(node.getLevel())
            .ordinalLabel(node.getOrdinalLabel())
            .heading(node.getHeading())
            .snippet(buildSnippet(node.getContentText(), q))
            .build());
        return PageResponse.from(mapped);
    }

    private String buildSnippet(String text, String q) {
        if (text == null || text.isBlank()) {
            return "";
        }
        if (q == null || q.isBlank()) {
            return truncate(text, 200);
        }
        String lower = text.toLowerCase();
        String qLower = q.toLowerCase();
        int idx = lower.indexOf(qLower);
        if (idx < 0) {
            return truncate(text, 200);
        }
        int start = Math.max(0, idx - SNIPPET_HALF);
        int end = Math.min(text.length(), idx + q.length() + SNIPPET_HALF);
        String prefix = start > 0 ? "…" : "";
        String suffix = end < text.length() ? "…" : "";
        String match = text.substring(idx, Math.min(text.length(), idx + q.length()));
        String pre = text.substring(start, idx);
        String post = text.substring(Math.min(text.length(), idx + q.length()), end);
        // Wrap the exact match with <mark> for simple highlighting in FE
        return prefix + pre + "<mark>" + match + "</mark>" + post + suffix;
    }

    private String truncate(String s, int max) {
        if (s.length() <= max) return s;
        return s.substring(0, max) + "…";
    }
}

