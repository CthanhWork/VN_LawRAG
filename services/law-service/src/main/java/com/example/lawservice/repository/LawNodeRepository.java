package com.example.lawservice.repository;

import com.example.lawservice.model.LawNode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface LawNodeRepository extends JpaRepository<LawNode, Long> {
    Page<LawNode> findByLaw_Id(Long lawId, Pageable pageable);
    
    // Fetch all nodes of a law ordered by sortKey for TOC building
    java.util.List<LawNode> findByLaw_IdOrderBySortKeyAsc(Long lawId);

    // Same as above but fetch parent to avoid LazyInitialization when open-in-view=false
    @Query("SELECT n FROM LawNode n LEFT JOIN FETCH n.parent WHERE n.law.id = :lawId ORDER BY n.sortKey")
    java.util.List<LawNode> findByLaw_IdOrderBySortKeyAscWithParent(@Param("lawId") Long lawId);
    
    Page<LawNode> findByContentTextContainingIgnoreCase(String keyword, Pageable pageable);
    
    @Query("SELECT n FROM LawNode n WHERE " +
           "(n.effectiveStart IS NULL OR n.effectiveStart <= :effectiveAt) AND " +
           "(n.effectiveEnd IS NULL OR n.effectiveEnd >= :effectiveAt)")
    Page<LawNode> findAllEffectiveAt(@Param("effectiveAt") LocalDate effectiveAt, Pageable pageable);
    
    @Query("SELECT n FROM LawNode n WHERE " +
           "n.law.id = :lawId AND " +
           "(n.effectiveStart IS NULL OR n.effectiveStart <= :effectiveAt) AND " +
           "(n.effectiveEnd IS NULL OR n.effectiveEnd >= :effectiveAt)")
    Page<LawNode> findByLaw_IdAndEffectiveAt(
        @Param("lawId") Long lawId, 
        @Param("effectiveAt") LocalDate effectiveAt, 
        Pageable pageable
    );
    
    @Query("SELECT n FROM LawNode n WHERE " +
           "LOWER(n.contentText) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
           "(n.effectiveStart IS NULL OR n.effectiveStart <= :effectiveAt) AND " +
           "(n.effectiveEnd IS NULL OR n.effectiveEnd >= :effectiveAt)")
    Page<LawNode> findByContentTextContainingIgnoreCaseAndEffectiveAt(
        @Param("keyword") String keyword, 
        @Param("effectiveAt") LocalDate effectiveAt, 
        Pageable pageable
    );

    // Fulltext search on content_text (requires FULLTEXT index ft_content)
    @Query(
        value = "SELECT * FROM law_nodes WHERE MATCH(content_text) AGAINST (?1 IN NATURAL LANGUAGE MODE)",
        countQuery = "SELECT count(*) FROM law_nodes WHERE MATCH(content_text) AGAINST (?1 IN NATURAL LANGUAGE MODE)",
        nativeQuery = true
    )
    Page<LawNode> fulltext(@Param("q") String q, Pageable pageable);
}
