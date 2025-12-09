package com.example.lawservice.dto;

import java.time.LocalDate;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Thông tin về điều/khoản trong văn bản")
public class LawNodeDTO {
    @Schema(description = "ID của node")
    private Long id;
    
    @Schema(description = "ID của văn bản chứa node này")
    private Long lawId;
    
    @Schema(description = "ID của node cha (nếu có)")
    private Long parentId;
    
    @Schema(description = "Cấp độ của node (PHAN/CHUONG/MUC/DIEU/KHOAN)")
    private String level;
    
    @Schema(description = "Số thứ tự/ký hiệu")
    private String ordinalLabel;
    
    @Schema(description = "Tiêu đề")
    private String heading;
    
    @Schema(description = "Nội dung dạng văn bản thuần")
    private String contentText;
    
    @Schema(description = "Khóa sắp xếp")
    private String sortKey;
    
    @Schema(description = "Ngày có hiệu lực")
    private LocalDate effectiveStart;
    
    @Schema(description = "Ngày hết hiệu lực")
    private LocalDate effectiveEnd;
}