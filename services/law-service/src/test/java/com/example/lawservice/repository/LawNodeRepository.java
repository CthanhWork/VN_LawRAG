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

    Page<LawNode> findByContentTextContainingIgnoreCase(String keyword, Pageable pageable);

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
}
