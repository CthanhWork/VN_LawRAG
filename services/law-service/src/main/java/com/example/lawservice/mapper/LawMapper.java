package com.example.lawservice.mapper;

import com.example.lawservice.dto.LawDTO;
import com.example.lawservice.dto.LawNodeDTO;
import com.example.lawservice.model.Law;
import com.example.lawservice.model.LawNode;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class LawMapper {

    // ==================== Law ====================
    public static LawDTO toDTO(Law law) {
        if (law == null) return null;

        LawDTO dto = new LawDTO();
        dto.setId(law.getId());
        // entity: code  -->  DTO: lawCode
        dto.setLawCode(law.getCode());
        dto.setTitle(law.getTitle());
        dto.setIssuingBody(law.getIssuingBody());
        dto.setPromulgationDate(law.getPromulgationDate());
        dto.setEffectiveDate(law.getEffectiveDate());
        dto.setExpireDate(law.getExpireDate());
        dto.setStatus(law.getStatus());
        dto.setField(law.getField());
        return dto;
    }

    public static List<LawDTO> toLawDTOs(List<Law> laws) {
        if (laws == null) return List.of();
        return laws.stream()
                .filter(Objects::nonNull)
                .map(LawMapper::toDTO)
                .collect(Collectors.toList());
    }

    // ==================== LawNode ====================
    public static LawNodeDTO toDTO(LawNode node) {
        if (node == null) return null;

        LawNodeDTO dto = new LawNodeDTO();
        dto.setId(node.getId());
        dto.setLawId(node.getLaw() != null ? node.getLaw().getId() : null);
        dto.setParentId(node.getParent() != null ? node.getParent().getId() : null);
        dto.setLevel(node.getLevel());
        dto.setOrdinalLabel(node.getOrdinalLabel());

        // Nếu entity là 'heading' thì giữ như dưới;
        // nếu entity là 'title' thì đổi thành: dto.setHeading(node.getTitle());
        dto.setHeading(node.getHeading());

        dto.setContentText(node.getContentText());
        dto.setSortKey(node.getSortKey());
        dto.setEffectiveStart(node.getEffectiveStart());
        dto.setEffectiveEnd(node.getEffectiveEnd());
        return dto;
    }

    public static List<LawNodeDTO> toLawNodeDTOs(List<LawNode> nodes) {
        if (nodes == null) return List.of();
        return nodes.stream()
                .filter(Objects::nonNull)
                .map(LawMapper::toDTO)
                .collect(Collectors.toList());
    }
}
