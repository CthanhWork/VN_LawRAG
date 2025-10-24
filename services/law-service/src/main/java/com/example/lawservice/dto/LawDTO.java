package com.example.lawservice.dto;

import java.time.LocalDate;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Thông tin về văn bản pháp luật")
public class LawDTO {
    @Schema(description = "ID của văn bản")
    private Long id;
    
    @Schema(description = "Số hiệu văn bản")
    private String lawCode;
    
    @Schema(description = "Tên văn bản")
    private String title;
    
    @Schema(description = "Cơ quan ban hành")
    private String issuingBody;
    
    @Schema(description = "Ngày ban hành")
    private LocalDate promulgationDate;
    
    @Schema(description = "Ngày có hiệu lực")
    private LocalDate effectiveDate;
    
    @Schema(description = "Ngày hết hiệu lực (nếu có)")
    private LocalDate expireDate;
    
    @Schema(description = "Trạng thái hiện tại")
    private String status;
    
    @Schema(description = "Lĩnh vực")
    private String field;
}