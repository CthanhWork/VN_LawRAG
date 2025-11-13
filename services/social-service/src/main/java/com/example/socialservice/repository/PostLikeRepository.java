package com.example.socialservice.repository;

import com.example.socialservice.model.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByPost_IdAndUserId(Long postId, Long userId);
    long deleteByPost_IdAndUserId(Long postId, Long userId);

    @Query("select pl.post.id as postId, count(pl.id) as cnt from PostLike pl where pl.post.id in :ids group by pl.post.id")
    List<Object[]> countByPostIds(@Param("ids") Collection<Long> postIds);

    @Query("select pl.post.id from PostLike pl where pl.post.id in :ids and pl.userId = :userId")
    List<Long> findLikedPostIdsByUser(@Param("userId") Long userId, @Param("ids") Collection<Long> postIds);

    long countByPost_Id(Long postId);
}
