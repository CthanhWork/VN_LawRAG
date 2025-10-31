package com.example.lawservice.controller;

import com.example.lawservice.dto.PageResponse;
import com.example.lawservice.dto.NodeDTO;
import com.example.lawservice.dto.NodeSearchDTO;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.service.NodeSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@Tag(name = "Nodes", description = "Law node management endpoints")
public class NodeController {
    private final LawNodeRepository nodeRepository;
    private final NodeSearchService nodeSearchService;

    public NodeController(LawNodeRepository nodeRepository, NodeSearchService nodeSearchService) {
        this.nodeRepository = nodeRepository;
        this.nodeSearchService = nodeSearchService;
    }

    @GetMapping("/laws/{lawId}/nodes")
    @Operation(summary = "Get nodes for a specific law")
    public PageResponse<NodeDTO> getByLaw(
        @PathVariable Long lawId,
        @Parameter(description = "Filter nodes effective at this date (YYYY-MM-DD)")
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
        LocalDate effectiveAt,
        @ParameterObject Pageable pageable
    ) {
        Page<LawNode> nodes;
        if (effectiveAt != null) {
            nodes = nodeRepository.findByLaw_IdAndEffectiveAt(lawId, effectiveAt, pageable);
        } else {
            nodes = nodeRepository.findByLaw_Id(lawId, pageable);
        }
        Page<NodeDTO> mapped = nodes.map(this::toDto);
        return PageResponse.from(mapped);
    }

    @GetMapping("/nodes/{id}")
    @Operation(summary = "Get a specific node by ID")
    public ResponseEntity<NodeDTO> getNode(@PathVariable Long id) {
        return nodeRepository.findById(id)
            .map(this::toDto)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/nodes/search")
    @Operation(summary = "Search nodes by content")
    public PageResponse<NodeDTO> searchNodes(
        @RequestParam String keyword,
        @Parameter(description = "Filter nodes effective at this date (YYYY-MM-DD)")
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
        LocalDate effectiveAt,
        @ParameterObject Pageable pageable
    ) {
        Page<LawNode> nodes;
        if (effectiveAt != null) {
            nodes = nodeRepository.findByContentTextContainingIgnoreCaseAndEffectiveAt(keyword, effectiveAt, pageable);
        } else {
            nodes = nodeRepository.findByContentTextContainingIgnoreCase(keyword, pageable);
        }
        Page<NodeDTO> mapped = nodes.map(this::toDto);
        return PageResponse.from(mapped);
    }

    @GetMapping("/nodes/search/fulltext")
    @Operation(summary = "Fulltext search nodes by content with highlight")
    public PageResponse<NodeSearchDTO> searchNodesFulltext(
        @RequestParam("q") String q,
        @ParameterObject Pageable pageable
    ) {
        return nodeSearchService.fulltext(q, pageable);
    }

    private NodeDTO toDto(LawNode n) {
        return NodeDTO.builder()
            .id(n.getId())
            .lawId(n.getLaw() != null ? n.getLaw().getId() : null)
            .parentId(n.getParent() != null ? n.getParent().getId() : null)
            .level(n.getLevel())
            .ordinalLabel(n.getOrdinalLabel())
            .heading(n.getHeading())
            .contentText(n.getContentText())
            .contentHtml(n.getContentHtml())
            .sortKey(n.getSortKey())
            .path(n.getPath())
            .title(n.getTitle())
            .effectiveStart(n.getEffectiveStart())
            .effectiveEnd(n.getEffectiveEnd())
            .build();
    }
}
