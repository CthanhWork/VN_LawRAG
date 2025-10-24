package com.example.lawservice.repository;

import com.example.lawservice.model.Law;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LawRepository extends JpaRepository<Law, Long> {
    Page<Law> findByCodeContainingIgnoreCaseOrTitleContainingIgnoreCase(
        String code, String title, Pageable pageable);
        
    @Query(value = "SELECT l FROM Law l WHERE " +
           "LOWER(l.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(l.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY " +
           "CASE WHEN LOWER(l.code) = LOWER(:keyword) THEN 0 " +
           "     WHEN LOWER(l.code) LIKE LOWER(CONCAT(:keyword, '%')) THEN 1 " +
           "     WHEN LOWER(l.title) LIKE LOWER(CONCAT(:keyword, '%')) THEN 2 " +
           "     ELSE 3 END, " +
           "l.code")
    List<Law> findSuggestions(@Param("keyword") String keyword, Pageable pageable);
    
    default List<Law> findSuggestions(String keyword, int limit) {
        return findSuggestions(keyword, PageRequest.of(0, limit));
    }
}
