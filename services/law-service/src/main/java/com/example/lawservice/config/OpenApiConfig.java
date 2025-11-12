package com.example.lawservice.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.tags.Tag;

@OpenAPIDefinition(
    info = @Info(
        title = "VN Law Service API",
        version = "v1",
        description = "REST API for laws, nodes and RAG QA integration (bridges to rag-service).",
        contact = @Contact(name = "VN Law RAG Starter", url = "https://github.com/", email = ""),
        license = @License(name = "Apache-2.0")
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Local"),
        @Server(url = "http://law-service:8080", description = "Docker Compose network")
    },
    tags = {
        @Tag(name = "Laws", description = "Law management endpoints"),
        @Tag(name = "Nodes", description = "Law node management endpoints"),
        @Tag(name = "QA", description = "Question Answering endpoints"),
        @Tag(name = "Admin", description = "Administrative operations (internal)")
    }
)
public class OpenApiConfig {
}

