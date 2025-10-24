package com.example.lawservice.controller;

import com.example.lawservice.dto.TocDTO;
import com.example.lawservice.model.Law;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.repository.LawRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "Laws", description = "Law management endpoints")
@RestController
@RequestMapping("/api/laws")
public class LawController {
    private final LawRepository lawRepository;
    private final LawNodeRepository nodeRepository;

    public LawController(LawRepository lawRepository, LawNodeRepository nodeRepository) {
        this.lawRepository = lawRepository;
        this.nodeRepository = nodeRepository;
    }

    @GetMapping
    public List<Law> getAll() {
        return lawRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Law> getById(@PathVariable Long id) {
        return lawRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @Operation(summary = "Search laws by code or title")
    public Page<Law> search(
            @RequestParam("keyword") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return lawRepository.findByCodeContainingIgnoreCaseOrTitleContainingIgnoreCase(
                keyword, keyword, PageRequest.of(page, size));

    }

    @GetMapping("/{id}/toc")
    @Operation(summary = "Get table of contents for a law")
    public ResponseEntity<List<TocDTO>> getTableOfContents(@PathVariable Long id) {
        if (!lawRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // Load all nodes for the law with parent fetched to avoid LazyInitialization (open-in-view=false)
        List<LawNode> nodes = nodeRepository.findByLaw_IdOrderBySortKeyAscWithParent(id);

        // Group by parent_id
        Map<Long, List<LawNode>> byParentId = nodes.stream()
                .collect(Collectors.groupingBy(n -> n.getParent() != null ? n.getParent().getId() : null));

        // Build tree from root nodes (parent_id IS NULL)
        List<LawNode> roots = byParentId.getOrDefault(null, new ArrayList<>());
        roots.sort((a, b) -> nullSafe(a.getSortKey()).compareToIgnoreCase(nullSafe(b.getSortKey())));

        List<TocDTO> toc = roots.stream()
                .map(n -> toToc(n, byParentId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(toc);
    }

    private TocDTO toToc(LawNode node, Map<Long, List<LawNode>> byParentId) {
        List<LawNode> children = byParentId.getOrDefault(node.getId(), new ArrayList<>());
        children.sort((a, b) -> nullSafe(a.getSortKey()).compareToIgnoreCase(nullSafe(b.getSortKey())));

        return TocDTO.builder()
                .id(node.getId())
                .label(preferLabel(node))
                .level(node.getLevel())
                .children(children.stream().map(c -> toToc(c, byParentId)).collect(Collectors.toList()))
                .build();
    }

    private String preferLabel(LawNode node) {
        String ordinal = trimToNull(node.getOrdinalLabel());
        if (ordinal != null) return ordinal;
        String heading = trimToNull(node.getHeading());
        if (heading != null) return heading;
        return trimToNull(node.getTitle());
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
