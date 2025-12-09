package com.example.lawservice.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

@Entity
@Table(name = "law_nodes")
public class LawNode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "law_id", nullable = false)
    private Law law;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private LawNode parent;

    @Column(nullable = false)
    private String level;

    @Column(name = "ordinal_label")
    private String ordinalLabel;

    @Column(columnDefinition = "TEXT")
    private String heading;

    @Column(name = "content_html", columnDefinition = "LONGTEXT")
    private String contentHtml;

    @Column(name = "content_text", columnDefinition = "LONGTEXT")
    private String contentText;

    @Column(name = "sort_key")
    private String sortKey;
    
    @Column(name = "path", nullable = false)
    private String path;
    
    @Column(name = "title")
    private String title;

    @Column(name = "effective_start")
    private LocalDate effectiveStart;

    @Column(name = "effective_end")
    private LocalDate effectiveEnd;

}
