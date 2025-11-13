package com.example.socialservice.repository;

import com.example.socialservice.model.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {
    List<PostMedia> findByPost_IdIn(Collection<Long> postIds);
}
