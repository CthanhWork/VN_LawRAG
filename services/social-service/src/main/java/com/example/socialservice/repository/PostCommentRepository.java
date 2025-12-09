package com.example.socialservice.repository;

import com.example.socialservice.model.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    @Query("select pc.post.id as postId, count(pc.id) as cnt from PostComment pc where pc.post.id in :ids group by pc.post.id")
    List<Object[]> countByPostIds(@Param("ids") Collection<Long> postIds);

    Page<PostComment> findByPost_IdOrderByCreatedAtAsc(Long postId, Pageable pageable);
    long countByPost_Id(Long postId);
}
