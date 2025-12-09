package com.example.lawservice.service;

import com.example.lawservice.clients.RagClient;
import com.example.lawservice.dto.LawUploadRequest;
import com.example.lawservice.dto.LawUploadResponse;
import com.example.lawservice.enums.StatusCode;
import com.example.lawservice.exception.CustomException;
import com.example.lawservice.model.Law;
import com.example.lawservice.model.LawNode;
import com.example.lawservice.repository.LawNodeRepository;
import com.example.lawservice.repository.LawRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class LawUploadService {
    private static final Logger log = LoggerFactory.getLogger(LawUploadService.class);
    private static final LocalDate DEFAULT_EFFECTIVE_START = LocalDate.of(1900, 1, 1);
    private static final LocalDate DEFAULT_EFFECTIVE_END = LocalDate.of(9999, 12, 31);

    private final LawRepository lawRepository;
    private final LawNodeRepository lawNodeRepository;
    private final RagClient ragClient;
    private final PdfTextExtractor pdfTextExtractor;
    private final Path storageDir;

    public LawUploadService(
            LawRepository lawRepository,
            LawNodeRepository lawNodeRepository,
            RagClient ragClient,
            PdfTextExtractor pdfTextExtractor,
            @Value("${law.upload-dir:uploads}") String uploadDir
    ) {
        this.lawRepository = lawRepository;
        this.lawNodeRepository = lawNodeRepository;
        this.ragClient = ragClient;
        this.pdfTextExtractor = pdfTextExtractor;
        this.storageDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageDir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create upload directory: " + this.storageDir, e);
        }
    }

    @Transactional
    public LawUploadResponse upload(MultipartFile file, LawUploadRequest request) throws CustomException {
        validate(file, request);

        String code = request.getCode().trim();
        Path storedFile = storeFile(file, code);
        String text = pdfTextExtractor.extract(storedFile);

        Optional<Law> existing = lawRepository.findByCodeIgnoreCase(code);
        boolean created = existing.isEmpty();
        Law law = existing.orElseGet(Law::new);

        if (existing.isPresent() && !Boolean.TRUE.equals(request.getReplaceExisting())) {
            throw new CustomException(StatusCode.CONFLICT, "Law code already exists, set replaceExisting=true to overwrite");
        }

        if (existing.isPresent() && Boolean.TRUE.equals(request.getReplaceExisting())) {
            deleteNodesForLaw(law.getId());
        }

        populateLaw(law, request, storedFile.toString());
        law = lawRepository.save(law);

        LawNode node = createRootNode(law, request, text);
        node = lawNodeRepository.save(node);

        boolean reindexed = Boolean.TRUE.equals(request.getTriggerReindex());
        if (reindexed) {
            ragClient.reindex();
        }

        return LawUploadResponse.builder()
                .lawId(law.getId())
                .lawCode(law.getCode())
                .title(law.getTitle())
                .nodeId(node.getId())
                .storedFile(storedFile.toString())
                .extractedChars(text != null ? text.length() : 0)
                .created(created)
                .reindexed(reindexed)
                .build();
    }

    private void validate(MultipartFile file, LawUploadRequest request) throws CustomException {
        if (file == null || file.isEmpty()) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "PDF file is required");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "File must be a PDF");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.equalsIgnoreCase("application/pdf")
                && !contentType.equalsIgnoreCase("application/octet-stream")) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "Unsupported content type: " + contentType);
        }
        if (request == null || !StringUtils.hasText(request.getCode()) || !StringUtils.hasText(request.getTitle())) {
            throw new CustomException(StatusCode.VALIDATION_ERROR, "code and title are required");
        }
    }

    private Path storeFile(MultipartFile file, String code) throws CustomException {
        String safeCode = code.replaceAll("[^a-zA-Z0-9_-]", "_");
        String fileName = safeCode + "-" + System.currentTimeMillis() + ".pdf";
        Path target = storageDir.resolve(fileName);
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return target;
        } catch (IOException e) {
            log.error("Failed to store file {}", target, e);
            throw new CustomException(StatusCode.INTERNAL_SERVER_ERROR, "Cannot store uploaded file");
        }
    }

    private void populateLaw(Law law, LawUploadRequest request, String storedPath) throws CustomException {
        law.setCode(request.getCode().trim());
        String docType = StringUtils.hasText(request.getDocType()) ? request.getDocType().trim() : null;
        if (docType != null) {
            law.setDocType(docType);
        } else if (law.getDocType() == null) {
            law.setDocType("LAW");
        }
        if (StringUtils.hasText(request.getTitle())) {
            law.setTitle(request.getTitle());
        }
        if (request.getIssuingBody() != null) {
            law.setIssuingBody(request.getIssuingBody());
        }
        if (request.getPromulgationDate() != null) {
            law.setPromulgationDate(request.getPromulgationDate());
        }
        if (request.getEffectiveDate() != null) {
            law.setEffectiveDate(request.getEffectiveDate());
        }
        if (request.getExpireDate() != null) {
            law.setExpireDate(request.getExpireDate());
        }
        law.setSourceUrl(storedPath);

        if (request.getRelatedLawId() != null) {
            var related = lawRepository.findById(request.getRelatedLawId())
                    .orElseThrow(() -> new CustomException(StatusCode.NOT_FOUND, "related law not found: " + request.getRelatedLawId()));
            law.setRelatedLaw(related);
        }
    }

    private LawNode createRootNode(Law law, LawUploadRequest request, String contentText) {
        LawNode node = new LawNode();
        node.setLaw(law);
        node.setParent(null);
        node.setLevel("DOCUMENT");
        node.setOrdinalLabel("PDF");
        node.setHeading(law.getTitle());
        node.setContentHtml(null);
        node.setContentText(contentText);
        node.setSortKey("000");
        node.setPath("/" + law.getCode());
        node.setTitle("Toan van PDF");

        LocalDate start = firstNonNull(request.getNodeEffectiveStart(), request.getEffectiveDate(), DEFAULT_EFFECTIVE_START);
        LocalDate end = firstNonNull(request.getNodeEffectiveEnd(), request.getExpireDate(), DEFAULT_EFFECTIVE_END);
        node.setEffectiveStart(start);
        node.setEffectiveEnd(end);
        return node;
    }

    private void deleteNodesForLaw(Long lawId) {
        List<LawNode> nodes = lawNodeRepository.findByLaw_IdOrderBySortKeyAsc(lawId);
        nodes.stream()
                .sorted(Comparator.comparingInt(this::pathDepth).reversed())
                .forEach(lawNodeRepository::delete);
    }

    private int pathDepth(LawNode node) {
        if (node.getPath() == null) {
            return 0;
        }
        String[] segments = node.getPath().split("/");
        int depth = 0;
        for (String s : segments) {
            if (!s.isEmpty()) {
                depth++;
            }
        }
        return depth;
    }

    private LocalDate firstNonNull(LocalDate... dates) {
        for (LocalDate d : dates) {
            if (d != null) {
                return d;
            }
        }
        return null;
    }
}
