package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@Schema(description = "Generic page wrapper for list endpoints")
public class PageResponse<T> {
    @Schema(description = "Items in the current page")
    private List<T> content;

    @Schema(description = "0-based page index")
    private int pageNumber;

    @Schema(description = "Page size")
    private int pageSize;

    @Schema(description = "Total number of items")
    private long totalElements;

    @Schema(description = "Total number of pages")
    private int totalPages;

    @Schema(description = "Is this the first page?")
    private boolean first;

    @Schema(description = "Is this the last page?")
    private boolean last;

    public static <T> PageResponse<T> from(Page<T> page) {
        PageResponse<T> response = new PageResponse<>();
        response.setContent(page.getContent());
        response.setPageNumber(page.getNumber());
        response.setPageSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
        return response;
    }
}
