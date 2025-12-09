package com.example.lawservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@Schema(description = "LLM-based legal analysis result with citations")
public class QaAnalyzeResponse {
    @Schema(
        description = "Answer text generated from LLM + RAG",
        example = "Anh K có quyền và nghĩa vụ thăm nom con, không ai được cản trở. Việc chị L cản trở là vi phạm pháp luật.\\nNếu anh K lạm dụng thăm nom gây ảnh hưởng xấu, chị L có quyền yêu cầu Tòa hạn chế quyền thăm nom của anh K.\\nNếu hành vi cản trở của chị L nghiêm trọng, anh K có thể đề nghị Tòa xem xét thay đổi người trực tiếp nuôi con (cân nhắc lợi ích tốt nhất của con).\\nCăn cứ pháp luật (/121/VBHN/VPQH/Chuong-V/Dieu-82/Khoan-3):\\n> Sau khi ly hôn, người không trực tiếp nuôi con có quyền, nghĩa vụ thăm nom con mà không ai được cản trở...\\n\\nAnh K có thể yêu cầu Tòa án thay đổi mức/phương thức cấp dưỡng nếu có căn cứ (thay đổi thu nhập, nhu cầu của con, hoặc nghi ngờ sử dụng sai mục đích).\\nNghi ngờ chị L dùng tiền cấp dưỡng sai mục đích là cơ sở để đề nghị Tòa xem xét, có thể chuyển qua bên thứ ba/nhà trường.\\nCăn cứ pháp luật (/121/VBHN/VPQH/Chuong-V/Dieu-82/Khoan-3):\\n> Sau khi ly hôn, người không trực tiếp nuôi con có quyền, nghĩa vụ thăm nom con mà không ai được cản trở..."
    )
    private String answer;

    @Schema(description = "Decision: VIOLATION | NO_VIOLATION | UNCERTAIN | INFO", example = "INFO")
    private String decision;

    @Schema(description = "Short explanation", example = "Ví dụ minh họa; không thay thế tư vấn pháp lý cá nhân.")
    private String explanation;

    @Schema(description = "Citations matched from context")
    private List<Citation> citations;

    @Schema(description = "Effective date used for analysis", example = "2025-11-21")
    private LocalDate effectiveAt;

    @Data
    @Builder
    public static class Citation {
        @Schema(example = "121/VBHN/VPQH")
        private String lawCode;

        @Schema(example = "/121/VBHN/VPQH/Chuong-V/Dieu-82/Khoan-3")
        private String nodePath;

        @Schema(example = "12345")
        private Long nodeId;
    }
}
