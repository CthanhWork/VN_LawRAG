package com.example.socialservice.repository;

import com.example.socialservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByEmailIgnoreCase(String email);

    @Query("""
        select u from User u
        where (:status is null or lower(u.status) = lower(:status))
          and (:keyword is null or lower(u.email) like lower(concat('%', :keyword, '%'))
               or lower(u.displayName) like lower(concat('%', :keyword, '%')))
        order by u.createdAt desc
    """)
    Page<User> searchUsers(@Param("status") String status, @Param("keyword") String keyword, Pageable pageable);
}
