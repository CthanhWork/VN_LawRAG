package com.example.lawservice.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class PdfTextExtractor {
    private static final Logger log = LoggerFactory.getLogger(PdfTextExtractor.class);

    public String extract(Path path) {
        if (path == null || !Files.exists(path)) {
            throw new IllegalArgumentException("PDF file not found: " + path);
        }
        try (PDDocument document = PDDocument.load(path.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            if (text == null || text.isBlank()) {
                throw new IllegalArgumentException("Cannot extract text from PDF: " + path);
            }
            return text.trim();
        } catch (IOException e) {
            log.error("Failed to read PDF {}", path, e);
            throw new RuntimeException("Failed to read PDF: " + path, e);
        }
    }
}
