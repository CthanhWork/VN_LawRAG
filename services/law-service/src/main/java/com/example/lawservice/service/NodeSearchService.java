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
    private static final int CONTEXT_CHARS = 80; // chars around each match
    private static final int MAX_WINDOWS = 3;    // max windows to include
    private static final int MAX_SNIPPET = 240;  // overall snippet cap

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
            return safeTruncateHtmlish(escapeHtml(text), MAX_SNIPPET);
        }

        String lower = text.toLowerCase();
        String qLower = q.toLowerCase();

        java.util.List<int[]> windows = new java.util.ArrayList<>();
        int pos = 0;
        int guard = 0;
        while (true) {
            int idx = lower.indexOf(qLower, pos);
            if (idx < 0) break;
            int start = Math.max(0, idx - CONTEXT_CHARS);
            int end = Math.min(text.length(), idx + q.length() + CONTEXT_CHARS);
            if (!windows.isEmpty()) {
                int[] last = windows.get(windows.size() - 1);
                if (start <= last[1] + 20) { // merge overlapping/close windows
                    last[1] = Math.max(last[1], end);
                } else {
                    windows.add(new int[]{start, end});
                }
            } else {
                windows.add(new int[]{start, end});
            }
            pos = idx + q.length();
            if (windows.size() >= MAX_WINDOWS) break;
            if (++guard > 1000) break; // safety
        }

        if (windows.isEmpty()) {
            return safeTruncateHtmlish(escapeHtml(text), MAX_SNIPPET);
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < windows.size(); i++) {
            if (i > 0) sb.append(" ... ");
            int[] w = windows.get(i);
            String segment = text.substring(w[0], w[1]);
            sb.append(highlightAndEscape(segment, q));
            if (sb.length() > MAX_SNIPPET + 64) break; // soft cap
        }
        return safeTruncateHtmlish(sb.toString(), MAX_SNIPPET);
    }

    private String highlightAndEscape(String segment, String q) {
        String lower = segment.toLowerCase();
        String qLower = q.toLowerCase();
        StringBuilder out = new StringBuilder();
        int i = 0;
        int idx;
        while ((idx = lower.indexOf(qLower, i)) >= 0) {
            String pre = segment.substring(i, idx);
            String match = segment.substring(idx, Math.min(segment.length(), idx + q.length()));
            out.append(escapeHtml(pre));
            out.append("<mark>").append(escapeHtml(match)).append("</mark>");
            i = idx + q.length();
        }
        out.append(escapeHtml(segment.substring(i)));
        return out.toString();
    }

    private String escapeHtml(String s) {
        if (s == null || s.isEmpty()) return "";
        String r = s;
        r = r.replace("&", "&amp;");
        r = r.replace("<", "&lt;");
        r = r.replace(">", "&gt;");
        r = r.replace("\"", "&quot;");
        r = r.replace("'", "&#39;");
        return r;
    }

    private String safeTruncateHtmlish(String html, int max) {
        if (html == null) return "";
        if (html.length() <= max) return html;
        int cut = max;
        // Prefer to cut at a boundary
        for (int i = max; i >= Math.max(0, max - 40); i--) {
            char c = html.charAt(i - 1);
            if (Character.isWhitespace(c) || c == '>' || c == ';' || c == '.') { // entity/word/tag-ish boundary
                cut = i;
                break;
            }
        }
        String trimmed = html.substring(0, cut) + " ...";
        // Balance <mark> tags if needed
        int open = countOccurrences(trimmed, "<mark>");
        int close = countOccurrences(trimmed, "</mark>");
        while (open > close) {
            trimmed += "</mark>";
            close++;
        }
        return trimmed;
    }

    private int countOccurrences(String s, String sub) {
        int count = 0, from = 0;
        while (true) {
            int idx = s.indexOf(sub, from);
            if (idx < 0) break;
            count++;
            from = idx + sub.length();
        }
        return count;
    }
}

