package com.example.lawservice.controller;

import com.example.lawservice.clients.RagClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "Administrative operations (internal)")
public class AdminController {
    private final RagClient ragClient;

    public AdminController(RagClient ragClient) {
        this.ragClient = ragClient;
    }

    @PostMapping("/reindex")
    @Operation(summary = "Trigger RAG re-embedding after data changes")
    public ResponseEntity<Void> reindex() {
        ragClient.reindex();
        return ResponseEntity.accepted().build();
    }
}

