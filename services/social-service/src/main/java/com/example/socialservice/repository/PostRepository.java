package com.example.socialservice.repository;

import com.example.socialservice.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.socialservice.enums.PostVisibility;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);
    Page<Post> findByAuthorIdAndVisibilityOrderByCreatedAtDesc(Long authorId, PostVisibility visibility, Pageable pageable);
    Page<Post> findByVisibilityOrderByCreatedAtDesc(PostVisibility visibility, Pageable pageable);

    @Query("""
        select p from Post p
        where (:authorId is null or p.authorId = :authorId)
          and (:visibility is null or p.visibility = :visibility)
        order by p.createdAt desc
    """)
    Page<Post> searchPosts(@Param("authorId") Long authorId, @Param("visibility") PostVisibility visibility, Pageable pageable);
}
