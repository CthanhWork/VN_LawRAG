package com.example.socialservice.repository;

import com.example.socialservice.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.socialservice.enums.PostVisibility;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);
    Page<Post> findByAuthorIdAndVisibilityOrderByCreatedAtDesc(Long authorId, PostVisibility visibility, Pageable pageable);
}
