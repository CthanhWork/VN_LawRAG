package com.example.lawservice.controller;

import com.example.lawservice.dto.PageResponse;
import com.example.lawservice.dto.NodeSearchDTO;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.service.NodeSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

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
    public PageResponse<LawNode> getByLaw(
        @PathVariable Long lawId,
        @Parameter(description = "Filter nodes effective at this date-time")
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) 
        LocalDateTime effectiveAt,
        Pageable pageable
    ) {
        Page<LawNode> nodes;
        if (effectiveAt != null) {
            nodes = nodeRepository.findByLaw_IdAndEffectiveAt(lawId, effectiveAt, pageable);
        } else {
            nodes = nodeRepository.findByLaw_Id(lawId, pageable);
        }
        return PageResponse.from(nodes);
    }

    @GetMapping("/nodes/{id}")
    @Operation(summary = "Get a specific node by ID")
    public ResponseEntity<LawNode> getNode(@PathVariable Long id) {
        return nodeRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/nodes/search")
    @Operation(summary = "Search nodes by content")
    public PageResponse<LawNode> searchNodes(
        @RequestParam String keyword,
        @Parameter(description = "Filter nodes effective at this date-time")
        @RequestParam(required = false) 
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) 
        LocalDateTime effectiveAt,
        Pageable pageable
    ) {
        Page<LawNode> nodes;
        if (effectiveAt != null) {
            nodes = nodeRepository.findByContentTextContainingIgnoreCaseAndEffectiveAt(keyword, effectiveAt, pageable);
        } else {
            nodes = nodeRepository.findByContentTextContainingIgnoreCase(keyword, pageable);
        }
        return PageResponse.from(nodes);
    }

    @GetMapping("/nodes/search/fulltext")
    @Operation(summary = "Fulltext search nodes by content with highlight")
    public PageResponse<NodeSearchDTO> searchNodesFulltext(
        @RequestParam("q") String q,
        Pageable pageable
    ) {
        return nodeSearchService.fulltext(q, pageable);
    }
}
