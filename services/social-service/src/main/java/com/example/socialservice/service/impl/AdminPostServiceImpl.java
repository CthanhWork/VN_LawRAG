package com.example.socialservice.service.impl;

import com.example.socialservice.dto.CommentResponse;
import com.example.socialservice.dto.PageResponse;
import com.example.socialservice.dto.PostMediaResponse;
import com.example.socialservice.dto.PostResponse;
import com.example.socialservice.enums.PostVisibility;
import com.example.socialservice.enums.StatusCode;
import com.example.socialservice.exception.CustomException;
import com.example.socialservice.model.Post;
import com.example.socialservice.model.PostMedia;
import com.example.socialservice.repository.PostCommentRepository;
import com.example.socialservice.repository.PostLikeRepository;
import com.example.socialservice.repository.PostMediaRepository;
import com.example.socialservice.repository.PostRepository;
import com.example.socialservice.service.AdminPostService;
import com.example.socialservice.service.CacheEvictService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AdminPostServiceImpl implements AdminPostService {
    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCommentRepository postCommentRepository;
    private final CacheEvictService cacheEvictService;

    public AdminPostServiceImpl(PostRepository postRepository,
                                PostMediaRepository postMediaRepository,
                                PostLikeRepository postLikeRepository,
                                PostCommentRepository postCommentRepository,
                                CacheEvictService cacheEvictService) {
        this.postRepository = postRepository;
        this.postMediaRepository = postMediaRepository;
        this.postLikeRepository = postLikeRepository;
        this.postCommentRepository = postCommentRepository;
        this.cacheEvictService = cacheEvictService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> listPosts(Long authorId, PostVisibility visibility, int page, int size) {
        var pageable = PageRequest.of(sanitizePage(page), sanitizeSize(size));
        var pg = postRepository.searchPosts(authorId, visibility, pageable);
        return mapPage(pg);
    }

    @Override
    @Transactional(readOnly = true)
    public PostResponse getPost(Long postId) throws CustomException {
        Post p = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(StatusCode.NOT_FOUND));
        return mapSingle(p);
    }

    @Override
    @Transactional
    public PostResponse updateVisibility(Long postId, PostVisibility visibility) throws CustomException {
        if (visibility == null) throw new CustomException(StatusCode.VALIDATION_ERROR, "Missing visibility");
        Post p = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(StatusCode.NOT_FOUND));
        p.setVisibility(visibility);
        Post saved = postRepository.save(p);
        evictCachesForAuthor(saved.getAuthorId());
        return mapSingle(saved);
    }

    @Override
    @Transactional
    public void deletePost(Long postId) throws CustomException {
        Post p = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(StatusCode.NOT_FOUND));
        Long authorId = p.getAuthorId();
        postRepository.delete(p);
        evictCachesForAuthor(authorId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> listComments(Long postId, int page, int size) throws CustomException {
        Post post = postRepository.findById(postId).orElse(null);
        if (post == null) throw new CustomException(StatusCode.NOT_FOUND);
        var pageable = PageRequest.of(sanitizePage(page), sanitizeSize(size));
        var pg = postCommentRepository.findByPost_IdOrderByCreatedAtAsc(postId, pageable);
        var items = pg.getContent().stream()
                .map(c -> new CommentResponse(c.getId(), postId, c.getAuthorId(), c.getContent(), c.getCreatedAt()))
                .toList();
        return new PageResponse<>(items, pg.getNumber(), pg.getSize(), pg.getTotalElements(), pg.getTotalPages(),
                pg.hasNext(), pg.hasPrevious());
    }

    @Override
    @Transactional
    public void deleteComment(Long postId, Long commentId) throws CustomException {
        var c = postCommentRepository.findById(commentId).orElse(null);
        if (c == null || !Objects.equals(c.getPost().getId(), postId)) {
            throw new CustomException(StatusCode.NOT_FOUND);
        }
        Long authorId = c.getPost().getAuthorId();
        postCommentRepository.delete(c);
        evictCachesForAuthor(authorId);
    }

    private PageResponse<PostResponse> mapPage(org.springframework.data.domain.Page<Post> pageObj) {
        List<Post> posts = pageObj.getContent();
        List<Long> ids = posts.stream().map(Post::getId).toList();

        Map<Long, List<PostMediaResponse>> mediaMap = new HashMap<>();
        if (!ids.isEmpty()) {
            List<PostMedia> mediaList = postMediaRepository.findByPost_IdIn(ids);
            for (PostMedia pm : mediaList) {
                mediaMap.computeIfAbsent(pm.getPost().getId(), k -> new ArrayList<>())
                        .add(new PostMediaResponse(pm.getId(), pm.getMediaType(), pm.getUrl(), pm.getMimeType(),
                                pm.getSizeBytes()));
            }
        }

        Map<Long, Long> likeCountMap = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : postLikeRepository.countByPostIds(ids)) {
                likeCountMap.put((Long) row[0], (Long) row[1]);
            }
        }

        Map<Long, Long> commentCountMap = new HashMap<>();
        if (!ids.isEmpty()) {
            for (Object[] row : postCommentRepository.countByPostIds(ids)) {
                commentCountMap.put((Long) row[0], (Long) row[1]);
            }
        }

        List<PostResponse> content = new ArrayList<>();
        for (Post p : posts) {
            PostResponse resp = new PostResponse(p.getId(), p.getAuthorId(), p.getContent(), p.getCreatedAt(),
                    p.getUpdatedAt(), mediaMap.getOrDefault(p.getId(), List.of()));
            resp.setLikeCount(likeCountMap.getOrDefault(p.getId(), 0L));
            resp.setCommentCount(commentCountMap.getOrDefault(p.getId(), 0L));
            resp.setLikedByCurrentUser(false);
            resp.setVisibility(p.getVisibility());
            content.add(resp);
        }

        return new PageResponse<>(content, pageObj.getNumber(), pageObj.getSize(), pageObj.getTotalElements(),
                pageObj.getTotalPages(), pageObj.hasNext(), pageObj.hasPrevious());
    }

    private PostResponse mapSingle(Post p) {
        List<PostMedia> mediaList = postMediaRepository.findByPost_IdIn(List.of(p.getId()));
        List<PostMediaResponse> media = mediaList.stream()
                .map(pm -> new PostMediaResponse(pm.getId(), pm.getMediaType(), pm.getUrl(), pm.getMimeType(),
                        pm.getSizeBytes()))
                .toList();
        long likeCount = postLikeRepository.countByPost_Id(p.getId());
        long commentCount = postCommentRepository.countByPost_Id(p.getId());
        PostResponse resp = new PostResponse(p.getId(), p.getAuthorId(), p.getContent(), p.getCreatedAt(),
                p.getUpdatedAt(), media);
        resp.setLikeCount(likeCount);
        resp.setCommentCount(commentCount);
        resp.setLikedByCurrentUser(false);
        resp.setVisibility(p.getVisibility());
        return resp;
    }

    private int sanitizePage(int page) {
        return Math.max(0, page);
    }

    private int sanitizeSize(int size) {
        return Math.min(50, Math.max(1, size));
    }

    private void evictCachesForAuthor(Long authorId) {
        if (authorId == null) return;
        cacheEvictService.evictMyPostsForUser(authorId);
        cacheEvictService.evictUserPostsForTarget(authorId);
        cacheEvictService.evictPublicFeed();
    }
}
