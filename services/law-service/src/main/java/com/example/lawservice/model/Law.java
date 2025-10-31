package com.example.lawservice.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "laws")
public class Law {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(name = "issuing_body")
    private String issuingBody;

    @Column(name = "promulgation_date")
    private LocalDate promulgationDate;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "expire_date")
    private LocalDate expireDate;

    private String status;

    private String field;

    private Boolean unified = false;

    @Column(name = "unified_source")
    private String unifiedSource;

    @Column(name = "source_url")
    private String sourceUrl;

    // getters / setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getIssuingBody() { return issuingBody; }
    public void setIssuingBody(String issuingBody) { this.issuingBody = issuingBody; }
    public LocalDate getPromulgationDate() { return promulgationDate; }
    public void setPromulgationDate(LocalDate promulgationDate) { this.promulgationDate = promulgationDate; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public LocalDate getExpireDate() { return expireDate; }
    public void setExpireDate(LocalDate expireDate) { this.expireDate = expireDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public Boolean getUnified() { return unified; }
    public void setUnified(Boolean unified) { this.unified = unified; }
    public String getUnifiedSource() { return unifiedSource; }
    public void setUnifiedSource(String unifiedSource) { this.unifiedSource = unifiedSource; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
