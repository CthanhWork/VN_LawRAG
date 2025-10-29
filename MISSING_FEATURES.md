# Thiếu Sót Chức Năng & Đề Xuất Hoàn Thiện

Tài liệu này tổng hợp các khoảng trống (gaps) của hệ thống hiện tại và đề xuất lộ trình bổ sung. Mục tiêu: hoàn thiện sản phẩm hỏi đáp pháp luật dựa trên RAG, an toàn, có trích dẫn, và sẵn sàng vận hành.

## 1) Hiện trạng nhanh
- Dịch vụ: `law-service` (Spring Boot) đọc MySQL, cung cấp API luật/nodes và cầu nối QA; `rag-service` (Flask) truy xuất ngữ cảnh từ Chroma bằng Sentence-Transformers.
- QA hiện tại là retrieval-only; phần sinh câu trả lời chỉ ghép từ ngữ cảnh, chưa dùng LLM:
  - `services/rag-service/app.py` (hàm `synthesize_answer`, tuyến `/qa`, `/gen`).
- Tham số sinh (temperature, max_tokens) có nhận vào nhưng chưa dùng.
- Reindex embeddings là stub, pipeline nhúng chạy thủ công qua script `embed_laws.py`.
- Bảo mật: `/api/**` mở (không auth), có API key cho `/api/admin/**` và rate-limit đơn giản cho `/api/qa`.
- Observability: có metrics Prometheus cho cả hai dịch vụ; logging/tracing end-to-end chưa có.

## 2) Các hạng mục còn thiếu

### 2.1 Người dùng & Sản phẩm
- Xác thực/Phân quyền: JWT/OAuth2, vai trò (user/admin), quản trị phiên.
- Lịch sử hội thoại, bookmarks/favorites, cài đặt cá nhân (ngày hiệu lực mặc định, ngôn ngữ).
- Cơ chế phản hồi (feedback/rating), báo cáo nội dung sai; moderation/triage.
- Hạn mức theo người dùng/nhóm, báo cáo sử dụng và audit logs.
- Giao diện người dùng (chat, duyệt mục lục, dẫn chiếu trực tiếp đến node pháp lý) và bảng điều khiển Admin.

### 2.2 AI/RAG & Xử lý ngôn ngữ (LLM)
- Tích hợp LLM thật cho `/api/qa/gen` (OpenAI/Azure/Local LLM):
  - Streaming (SSE), bắt buộc trích dẫn nguồn, cơ chế từ chối khi thiếu căn cứ (no‑answer/ask‑clarification).
  - Thực thi các tham số `temperature`, `max_tokens`, `k` và fallback retrieval-only khi LLM lỗi.
- Cải thiện truy xuất: reranker (cross-encoder), hybrid search (BM25 + vector), multi-query/HyDE, đồng nghĩa/chuẩn hoá truy vấn.
- Chunking tốt hơn: cắt theo câu/độ dài với overlap thay vì nhúng nguyên node dài; kiểm soát kích thước ngữ cảnh.
- Suy luận thời gian hiệu lực: diễn giải mốc thời gian trong câu hỏi, lọc theo `effective_at` chính xác (kiểu ngày, không so sánh chuỗi).
- Guardrails: chống prompt injection/jailbreak, lọc PII và nội dung nhạy cảm, kiểm tra tính gắn nguồn (faithfulness).
- Đánh giá: bộ kiểm thử offline cho recall, MRR, faithfulness; tập vàng (golden set) và báo cáo định kỳ.

### 2.3 Dữ liệu & Pipeline
- Pipeline nhúng tự động: job nền hoặc hàng đợi (Redis/RQ/Celery) để reindex khi dữ liệu thay đổi; incremental update & de-dup.
- Thu nạp tài liệu (PDF/Docx/HTML), trích xuất/chuẩn hóa cấu trúc, theo dõi phiên bản và nguồn gốc (provenance).
- Quản trị kho vector: backup/khôi phục, dọn dẹp, snapshot; xem xét hỗ trợ nhiều collection/tập luật.
- Cache (Redis) cho kết quả truy xuất và câu trả lời phổ biến; cache chiến lược cho reranker/embedding.

### 2.4 Hệ thống & Vận hành
- Bảo mật dịch vụ RAG: auth/ratelimit riêng, CORS chặt, giới hạn kích thước body, tường lửa nội bộ.
- Observability nâng cao: log có cấu trúc, tracing (OpenTelemetry) xuyên dịch vụ, dashboard Grafana.
- Chuẩn hóa API: versioning (`/v1`), schema lỗi thống nhất, validation DTO (`@Valid`) & ràng buộc.
- CI/CD & Kiểm thử: unit + integration + contract tests cho client RAG; test tải & độ trễ (Locust/k6).
- Khả năng mở rộng: cấu hình pool kết nối, pre-warm embeddings, concurrency, auto-scaling, giới hạn tài nguyên.
- Bảo mật vận hành: quản lý secrets (env/secret manager), backup định kỳ MySQL/Chroma, DR runbooks.

### 2.5 Pháp lý & Tuân thủ
- Cảnh báo/disclaimer sử dụng; phạm vi trách nhiệm.
- Bản quyền/giấy phép dữ liệu nguồn; chính sách lưu trữ log/PII.

## 3) Lộ trình ưu tiên (đẩy LLM & bảo mật về cuối)

Lộ trình này ưu tiên hoàn thiện chức năng hệ thống, dữ liệu và chất lượng truy xuất trước; các hạng mục LLM và bảo mật tổng thể sẽ thực hiện ở giai đoạn cuối.

### Sprint 1: Truy xuất & API đúng đắn
- Sửa lọc thời gian hiệu lực ở `rag-service`: parse `effective_at`, `effective_start`, `effective_end` về kiểu ngày và so sánh chuẩn, không so sánh chuỗi.
- Cải thiện snippet highlight trong `NodeSearchService` (nhiều vị trí match, giới hạn độ dài, an toàn HTML cơ bản).
- Bổ sung endpoint gợi ý luật (autocomplete) dựa trên `LawRepository.findSuggestions` (ví dụ: `GET /api/laws/suggest?keyword=...&limit=10`).
- Rà soát và thống nhất định dạng `effectiveAt` trong tài liệu vs. code (Date vs. DateTime) để tránh nhầm lẫn.
- Tiêu chí: API trả về ổn định, tìm kiếm cho kết quả nhất quán theo thời gian hiệu lực.

#### Chi tiết triển khai (theo best practices từ public APIs)

- Lọc theo thời gian hiệu lực (rag-service)
  - Thiết kế: sử dụng định dạng chuẩn ISO 8601 Date `YYYY-MM-DD` cho `effective_at` (JSON body) và trường metadata `effective_start`, `effective_end` trong Chroma.
  - Các bước:
    - Parse `effective_at` về `date` (Python `datetime.date`), mặc định `date.today()` nếu không truyền.
    - Khi truy vấn Chroma, parse `effective_start`, `effective_end` (string ISO) về `date` trước khi so sánh; nếu null thì dùng sentinel `1900-01-01`/`9999-12-31`.
    - Không so sánh chuỗi; chỉ so sánh đối tượng `date`.
  - Ví dụ: với `effective_at = 2024-01-01`, chỉ giữ items thỏa `start <= 2024-01-01 <= end`.
  - Tiêu chí nghiệm thu:
    - Yêu cầu với cùng câu hỏi nhưng khác `effective_at` trả về kết quả khác nhau có kiểm soát.
    - Test đơn vị cho hàm lọc, bao phủ biên `null start/end` và so sánh ngày.

- Snippet highlight (NodeSearchService)
  - Thiết kế: tạo tối đa N đoạn (ví dụ N=3), mỗi đoạn dài tối đa ~200 ký tự, có overlap bối cảnh; làm nổi cụm khớp bằng `<mark>…</mark>`; escape HTML phần văn bản gốc để an toàn XSS, chỉ cho phép thẻ `<mark>`.
  - Các bước:
    - Dùng `Pattern`/`Matcher` (case-insensitive) để tìm nhiều vị trí trùng; lấy các vùng lân cận theo cửa sổ cố định (ví dụ 100 trước, 100 sau).
    - Escape HTML cho phần trước/sau; chữ khớp giữ nguyên và được bao bằng `<mark>`.
    - Ghép các đoạn bằng ký tự ` … `; cắt gọn nếu vượt quá tổng độ dài tối đa (ví dụ 600–800 ký tự).
  - Tiêu chí nghiệm thu:
    - Nhiều lần xuất hiện từ khóa sẽ tạo nhiều `<mark>` và được cắt gọn hợp lý.
    - Không rò rỉ HTML không mong muốn (đã escape), chỉ `<mark>` xuất hiện.

- Endpoint gợi ý luật (autocomplete)
  - Thiết kế API: `GET /api/laws/suggest?keyword={q}&limit={n}`
    - Tham số bắt buộc: `keyword` (min length 2).
    - Tùy chọn: `limit` (1–20, mặc định 10). Trả về danh sách nhẹ gồm `id`, `code`, `title`.
    - Lấy dữ liệu qua `LawRepository.findSuggestions(keyword, limit)`.
    - Trả mã lỗi chuẩn: `400` nếu thiếu/không hợp lệ `keyword`, `200` luôn trả mảng (có thể rỗng).
  - Ví dụ response:
    ```json
    [
      { "id": 1, "code": "52/2014/QH13", "title": "Luật Hôn nhân và Gia đình" }
    ]
    ```
  - Tiêu chí nghiệm thu:
    - Thời gian đáp ứng < 100ms trên dữ liệu mẫu; giới hạn `limit` được áp dụng.
    - Đầu ra ổn định về cấu trúc, không phụ thuộc thứ tự DB bất định (có ORDER BY trong query).

- Thống nhất định dạng `effectiveAt`
  - Quy ước: dùng `effectiveAt` (camelCase) cho query params; dùng `effective_at` (snake_case) trong JSON body; cả hai là Date ISO `YYYY-MM-DD` (không có time-of-day).
  - Cập nhật: sửa tài liệu `services/law-service/docs/api-usage.md` để phản ánh quy ước; rà soát `RagClient` để gửi `effective_at` ở định dạng `YYYY-MM-DD` thay vì `LocalDateTime#toString()`.
  - Tương thích ngược: tạm thời chấp nhận DateTime ở client (parse và truncate về Date) trong 1 phiên bản; log cảnh báo deprecation.

- Tiêu chí Sprint 1 (done)
  - Bộ test đơn vị/ tích hợp cho lọc ngày và suggest đạt xanh; tài liệu và Postman collection được cập nhật.
  - Độ ổn định: cùng input → cùng output; khác `effectiveAt` → khác output theo kỳ vọng.

### Sprint 2: Pipeline nhúng & Reindex tự động
- Hiện thực `/api/admin/reindex` thực sự: kích hoạt job nền để đọc DB → chunk → embed → upsert vào Chroma; có endpoint theo dõi tiến độ.
- Cải tiến chunking trong `embed_laws.py`: chia đoạn dài theo câu/ký tự với overlap, batch upsert, đảm bảo idempotency.
- Ghi nhật ký tiến trình và thống kê số chunk mới/cập nhật/bỏ qua.
- Tiêu chí: Reindex không chặn API; có thể quan sát tiến độ và khôi phục khi lỗi.

### Sprint 3: Hiệu năng & Cache
- Dùng Redis cache cho kết quả truy xuất (key theo `question+effective_at+k`), TTL hợp lý; cache thêm các lệnh query MySQL tốn kém.
- Tối ưu index DB (đã có FULLTEXT); rà soát truy vấn, paging nhất quán (chuẩn hóa `PageResponse` cho tất cả list API nếu cần).
- Tiêu chí: Độ trễ truy xuất giảm rõ rệt trong đường nóng; tài nguyên ổn định.

### Sprint 4: Trải nghiệm & Phân tích
- Mở rộng API cho UI: breadcrumbs/siblings cho `law_nodes`, liên kết dẫn chiếu rõ ràng (path → URL).
- Thêm metrics tuỳ chỉnh (đếm truy vấn theo chủ đề, thời gian hiệu lực, top câu hỏi), log có cấu trúc phục vụ BI.
- Tiêu chí: FE có đủ dữ liệu dựng UI dẫn chiếu; có số liệu sử dụng để ra quyết định.

### Sprint 5: Kiểm thử & Quan sát
- Bổ sung test tích hợp cho `RagClient`, `NodeSearchService`, và các controller tìm kiếm; test dữ liệu mẫu với Flyway.
- Thêm tracing xuyên dịch vụ law-service → rag-service (header tương quan đơn giản) và dashboard Prometheus/Grafana cơ bản.
- Tiêu chí: pipeline CI xanh; có khả năng truy vết yêu cầu qua hai dịch vụ.

### Sprint 6 (Cuối): LLM & Bảo mật tổng thể
- Tích hợp LLM cho `/api/qa/gen` (streaming, citations, no‑answer) và guardrails.
- Bảo mật: auth người dùng (JWT/OAuth2), phân quyền, siết CORS, quản lý secrets, rate-limit theo user/nhóm, audit.
- Tiêu chí: trả lời sinh có trích dẫn tin cậy; bề mặt tấn công được kiểm soát.

## 4) Biến môi trường/ cấu hình gợi ý
- RAG/LLM: `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`/`AZURE_OPENAI_*`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`.
- Reranker: `RERANKER_MODEL`, `RERANK_TOP_K`.
- Pipeline: `EMBED_BATCH_SIZE`, `REINDEX_SCHEDULE_CRON`.
- Bảo mật: `JWT_SECRET`, `SECURITY_ADMIN_API_KEY`, `ALLOWED_ORIGINS`.
- Observability: `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL`.

## 5) Hạng mục khả thi nhanh (quick wins)
- Sửa so sánh ngày ở `rag-service` (parse về `date` thay vì so sánh chuỗi).
- Thêm endpoint gợi ý luật (`/api/laws/suggest`) dùng `findSuggestions` có sẵn.
- Chuẩn hóa lỗi/validation DTO ở `law-service`, bổ sung vài bài test tích hợp cho QA và search.
- Tái sử dụng Redis để cache kết quả truy xuất phổ biến (không đụng đến auth).

---

Ghi chú: Đây là bộ khuyến nghị tổng quát dựa trên mã nguồn hiện tại. Thứ tự ưu tiên có thể điều chỉnh theo mục tiêu kinh doanh (độ chính xác vs. tốc độ ra mắt vs. bảo mật/vận hành).
## Cap nhat da trien khai (hoan tat cac muc yeu cau)

- Sua loc thoi gian hieu luc o `rag-service`
  - Parse `effective_at`, `effective_start`, `effective_end` ve kieu ngay va so sanh chuan (khong so sanh chuoi).
  - Chap nhan ca input dang `YYYY-MM-DD` hoac ISO DateTime, quy ve `YYYY-MM-DD` khi so sanh va tra ve.
  - Thay doi chinh: `services/rag-service/app.py` (ham `_parse_date`, dung trong `/qa` va `/gen`).

- Cai thien snippet highlight trong `NodeSearchService`
  - Ho tro nhieu vi tri match (toi da 3 cum), hop nhat cum gan nhau, gioi han tong do dai ~240 ky tu.
  - Escape HTML co ban (`&`, `<`, `>`, `"`, `'`), chi chen the `<mark>` an toan; cat chuoi ton trong ranh gioi word/tag de han che gay markup.
  - Thay doi chinh: `services/law-service/src/main/java/com/example/lawservice/service/NodeSearchService.java`.

- Bo sung endpoint goi y luat (autocomplete)
  - Endpoint: `GET /api/laws/suggest?keyword=...&limit=10` (gioi han toi da 50).
  - Dua tren `LawRepository.findSuggestions`, tra ve `List<SuggestionDTO>` gom `id`, `code`, `text`, `type=LAW`.
  - Thay doi chinh:
    - `services/law-service/src/main/java/com/example/lawservice/service/SuggestionService.java` (ho tro `limit`).
    - `services/law-service/src/main/java/com/example/lawservice/controller/LawController.java` (them endpoint).

- Ra soat va thong nhat dinh dang `effectiveAt`
  - Quy uoc: dung Date ISO `YYYY-MM-DD` (khong co time-of-day) thong nhat cho ca query/body.
  - Node APIs: doi `LocalDateTime` -> `LocalDate` o controller/repository.
  - QA APIs: `/api/qa` nhan `effectiveAt` qua query param (Date); `/api/qa/gen` nhan trong JSON body (Date).
  - RAG client: gui sang RAG `effective_at` o dinh dang `YYYY-MM-DD`.
  - Thay doi chinh:
    - `services/law-service/src/main/java/com/example/lawservice/controller/NodeController.java`
    - `services/law-service/src/main/java/com/example/lawservice/repository/LawNodeRepository.java`
    - `services/law-service/src/main/java/com/example/lawservice/controller/QAController.java`
    - `services/law-service/src/main/java/com/example/lawservice/dto/QaGenRequest.java`
    - `services/law-service/src/main/java/com/example/lawservice/dto/QaResponse.java`
    - `services/law-service/src/main/java/com/example/lawservice/dto/QaGenResponse.java`
    - `services/law-service/src/main/java/com/example/lawservice/clients/RagClient.java`
    - Tai lieu: `services/law-service/docs/api-usage.md`, README.

- Tieu chi on dinh & nhat quan theo thoi gian hieu luc
  - So sanh bang `LocalDate`/`date` giup ket qua tim kiem/QA nhat quan theo ngay.
  - Snippet highlight on dinh, an toan HTML co ban, co gioi han do dai.

Ghi chu kiem thu nhanh
- Da cap nhat test: `services/law-service/src/test/java/com/example/lawservice/controller/QAControllerTest.java` dung `LocalDate`.
- Nen chay lai build/test Maven de xac nhan kieu ngay dong nhat sau refactor.
# Thi���u SA3t Ch��cc N��ng & ��? Xu���t HoA�n Thi���n
