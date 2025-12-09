package com.example.lawservice.controller;

import com.example.lawservice.dto.NodeDTO;
import com.example.lawservice.dto.NodeSearchDTO;
import com.example.lawservice.dto.PageResponse;
import com.example.lawservice.dto.QaAnalyzeResponse;
import com.example.lawservice.dto.QaRequest;
import com.example.lawservice.dto.SuggestionDTO;
import com.example.lawservice.dto.TocDTO;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.exception.CustomException;
import com.example.lawservice.model.Law;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.payload.ApiResponse;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.repository.LawRepository;
import com.example.lawservice.service.NodeSearchService;
import com.example.lawservice.service.QAService;
import com.example.lawservice.service.SuggestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/laws")
@Tag(name = "Admin Laws", description = "Admin endpoints for laws, nodes, QA sandbox (protected by X-API-KEY)")
public class AdminLawQueryController {
    private final LawRepository lawRepository;
    private final LawNodeRepository nodeRepository;
    private final SuggestionService suggestionService;
    private final NodeSearchService nodeSearchService;
    private final QAService qaService;

    public AdminLawQueryController(LawRepository lawRepository,
                                   LawNodeRepository nodeRepository,
                                   SuggestionService suggestionService,
                                   NodeSearchService nodeSearchService,
                                   QAService qaService) {
        this.lawRepository = lawRepository;
        this.nodeRepository = nodeRepository;
        this.suggestionService = suggestionService;
        this.nodeSearchService = nodeSearchService;
        this.qaService = qaService;
    }

    // --- Laws ---

    @GetMapping
    @Operation(summary = "List laws (with optional keyword search)")
    public ResponseEntity<ApiResponse<PageResponse<Law>>> listLaws(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)));
        Page<Law> pg;
        if (keyword != null && !keyword.isBlank()) {
            pg = lawRepository.findByCodeContainingIgnoreCaseOrTitleContainingIgnoreCase(keyword, keyword, pageable);
        } else {
            pg = lawRepository.findAll(pageable);
        }
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), PageResponse.from(pg)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get law detail")
    public ResponseEntity<ApiResponse<Law>> getLaw(@PathVariable Long id) {
        return lawRepository.findById(id)
                .map(law -> ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), law)))
                .orElse(ResponseEntity.status(404).body(ApiResponse.of(StatusCode.NOT_FOUND.getCode(), "Not found", null)));
    }

    @GetMapping("/suggest")
    @Operation(summary = "Suggest laws by keyword (autocomplete)")
    public ResponseEntity<ApiResponse<List<SuggestionDTO>>> suggest(
            @RequestParam("keyword") String keyword,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        List<SuggestionDTO> items = suggestionService.getSuggestions(keyword, limit);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), items));
    }

    @GetMapping("/{id}/toc")
    @Operation(summary = "Get table of contents for a law")
    public ResponseEntity<ApiResponse<List<TocDTO>>> toc(@PathVariable Long id) {
        if (!lawRepository.existsById(id)) {
            return ResponseEntity.status(404).body(ApiResponse.of(StatusCode.NOT_FOUND.getCode(), "Not found", null));
        }
        List<LawNode> nodes = nodeRepository.findByLaw_IdOrderBySortKeyAscWithParent(id);
        Map<Long, List<LawNode>> byParentId = nodes.stream()
                .filter(n -> n.getParent() != null)
                .collect(Collectors.groupingBy(n -> n.getParent().getId()));
        List<LawNode> roots = nodes.stream()
                .filter(n -> n.getParent() == null)
                .collect(Collectors.toCollection(ArrayList::new));
        roots.sort((a, b) -> nullSafe(a.getSortKey()).compareToIgnoreCase(nullSafe(b.getSortKey())));
        List<TocDTO> toc = roots.stream().map(n -> toToc(n, byParentId)).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), toc));
    }

    @GetMapping("/{id}/related")
    @Operation(summary = "Get related laws")
    public ResponseEntity<ApiResponse<List<Law>>> related(
            @PathVariable Long id,
            @RequestParam(value = "docType", required = false) String docType) {
        if (!lawRepository.existsById(id)) {
            return ResponseEntity.status(404).body(ApiResponse.of(StatusCode.NOT_FOUND.getCode(), "Not found", null));
        }
        List<Law> items = (docType != null && !docType.isBlank())
                ? lawRepository.findByRelatedLaw_IdAndDocTypeIgnoreCase(id, docType)
                : lawRepository.findByRelatedLaw_Id(id);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), items));
    }

    // --- Nodes ---

    @GetMapping("/{lawId}/nodes")
    @Operation(summary = "List nodes of a law")
    public ResponseEntity<ApiResponse<PageResponse<NodeDTO>>> nodesByLaw(
            @PathVariable Long lawId,
            @Parameter(description = "Filter nodes effective at this date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt,
            @ParameterObject Pageable pageable) {
        Page<LawNode> nodes = effectiveAt != null
                ? nodeRepository.findByLaw_IdAndEffectiveAt(lawId, effectiveAt, pageable)
                : nodeRepository.findByLaw_Id(lawId, pageable);
        Page<NodeDTO> mapped = nodes.map(this::toDto);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), PageResponse.from(mapped)));
    }

    @GetMapping("/{lawId}/nodes/by-parent")
    @Operation(summary = "List nodes by parent to load chapters/sections lazily")
    public ResponseEntity<ApiResponse<PageResponse<NodeDTO>>> nodesByParent(
            @PathVariable Long lawId,
            @RequestParam(value = "parentId", required = false) Long parentId,
            @Parameter(description = "Filter nodes effective at this date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt,
            @ParameterObject Pageable pageable
    ) {
        Page<LawNode> nodes = effectiveAt != null
                ? nodeRepository.findByLaw_IdAndParentIdEffectiveAt(lawId, parentId, effectiveAt, pageable)
                : nodeRepository.findByLaw_IdAndParentId(lawId, parentId, pageable);
        Page<NodeDTO> mapped = nodes.map(this::toDto);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), PageResponse.from(mapped)));
    }

    @GetMapping("/nodes/{id}")
    @Operation(summary = "Get node detail")
    public ResponseEntity<ApiResponse<NodeDTO>> getNode(@PathVariable Long id) {
        return nodeRepository.findById(id)
                .map(n -> ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), toDto(n))))
                .orElse(ResponseEntity.status(404).body(ApiResponse.of(StatusCode.NOT_FOUND.getCode(), "Not found", null)));
    }

    @GetMapping("/nodes/search")
    @Operation(summary = "Search nodes by content (LIKE)")
    public ResponseEntity<ApiResponse<PageResponse<NodeDTO>>> searchNodes(
            @RequestParam String keyword,
            @Parameter(description = "Filter nodes effective at this date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt,
            @ParameterObject Pageable pageable) {
        Page<LawNode> nodes = effectiveAt != null
                ? nodeRepository.findByContentTextContainingIgnoreCaseAndEffectiveAt(keyword, effectiveAt, pageable)
                : nodeRepository.findByContentTextContainingIgnoreCase(keyword, pageable);
        Page<NodeDTO> mapped = nodes.map(this::toDto);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), PageResponse.from(mapped)));
    }

    @GetMapping("/nodes/search/fulltext")
    @Operation(summary = "Fulltext search nodes by content with highlight")
    public ResponseEntity<ApiResponse<PageResponse<NodeSearchDTO>>> searchNodesFulltext(
            @RequestParam("q") String q,
            @ParameterObject Pageable pageable) {
        PageResponse<NodeSearchDTO> resp = nodeSearchService.fulltext(q, pageable);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), resp));
    }

    // --- QA sandbox ---

    @PostMapping("/qa/analyze")
    @Operation(summary = "QA sandbox for admin (delegates to RAG via QAService)")
    public ResponseEntity<ApiResponse<QaAnalyzeResponse>> analyze(
            @RequestBody QaRequest body,
            @Parameter(description = "Effective date (YYYY-MM-DD)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate effectiveAt
    ) throws CustomException {
        final int k = 10;
        QaAnalyzeResponse result = qaService.analyze(body, effectiveAt, k);
        return ResponseEntity.ok(ApiResponse.of(StatusCode.OK.getCode(), StatusCode.OK.getMessage(), result));
    }

    // --- helpers ---

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
