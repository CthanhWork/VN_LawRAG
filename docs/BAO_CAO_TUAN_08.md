# BÁO CÁO TUẦN 08 - VN Law RAG

_Phạm vi:_ hoàn thiện newsfeed cá nhân hóa, realtime tương tác, an toàn media và vận hành/quan sát cho social-service; chuẩn bị bước mở rộng theo dõi/hardening bảo mật.

**Link source code (GitHub develop):** https://github.com/CthanhWork/VN_LawRAG/tree/develop

## 1) Tóm tắt
- Hoàn thiện newsfeed cá nhân hóa (follow/following), xếp hạng bài viết theo độ mới + liên quan; bổ sung hành vi ẩn/báo cáo để cá nhân hóa mạnh hơn dòng bài.
- Bổ sung realtime cập nhật like/comment qua SSE, đồng bộ đếm và trạng thái tương tác, giảm chênh lệch dữ liệu giữa nhiều phiên trình duyệt.
- Cứng hóa media pipeline: kiểm tra MIME + đuôi, giới hạn kích thước, tạo thumbnail ảnh, quét virus (mock) trước khi lưu; tinh chỉnh rate limit + audit log cho các thao tác nhạy cảm.
- DevOps/Observability: thêm index DB, tối ưu cache theo follow, dashboard log/metrics; hoàn thiện bộ test tích hợp + E2E cho luồng bài và tương tác, kèm thử tải nhẹ để đo P95.
- Ưu tiên trải nghiệm: bổ sung API quản lý bài đã ẩn, enrich dữ liệu trả về feed (isFolloweePost, isHidden, thumbnail) và cập nhật đầy đủ trên Swagger với Bearer Auth.

## 2) Công việc đã thực hiện (chi tiết)
### 2.1 Newsfeed cá nhân hóa & quan hệ follow
- Thiết kế bảng `follows (follower_id, followee_id, created_at)` với ràng buộc unique, cascade khi xóa user; thêm chỉ mục để phục vụ feed và danh sách follow.
- API follow/unfollow/liệt kê: `POST|DELETE /api/social/follow/{userId}`, `GET /api/social/followers`, `GET /api/social/following` (phân trang, kiểm tra JWT, trả kèm tổng số).
- Feed cá nhân: `GET /api/social/posts/feed` ưu tiên bài PUBLIC của followee, fallback bài công khai, tham số `ranking=latest|relevant` để chọn cách xếp.
- Xếp hạng: score = w1*độ mới + w2*số like + w3*số comment (configurable); ưu tiên bài followee và bài vừa có tương tác nhằm giữ dòng bài “tươi” nhưng vẫn liên quan.
- Ẩn/Báo cáo: `POST /api/social/posts/{postId}/hide`, `POST /api/social/posts/{postId}/report` (lý do text), loại khỏi feed, ghi audit và sẵn sàng gắn quy trình kiểm duyệt.

### 2.2 Realtime (SSE) cho tương tác
- Endpoint SSE: `GET /api/social/posts/stream` (JWT) push sự kiện like/comment/visibility thay đổi với payload tối giản, có `eventId` để client resume nếu rớt.
- Producer cho like/unlike/comment/đổi visibility; bảo vệ backpressure bằng hàng đợi vòng (cỡ 1k sự kiện/người), drop oldest để tránh kẹt khi client treo.
- Client mẫu trong doc: lắng nghe EventSource, cập nhật đếm và cờ `likedByCurrentUser` ngay trên UI, không cần reload trang; khuyến nghị retry với `Last-Event-Id`.

### 2.3 Media pipeline & bảo mật
- Kiểm tra MIME + đuôi whitelist (image/png, image/jpeg, image/webp, video/mp4); từ chối và log cảnh báo nếu lệch MIME/đuôi, tránh upload giả mạo.
- Giới hạn kích thước: ảnh <= 10MB, video <= 150MB; trả lỗi 413 kèm thông báo ngắn, giảm nguy cơ tràn bộ nhớ khi user upload file quá lớn.
- Tạo thumbnail (ảnh) 512px max cạnh dài bằng Thumbnailator; lưu song song với media chính, trả `thumbnailUrl` để feed tải nhẹ; dọn dẹp nếu transaction rollback.
- Quét virus mock (stub) trước khi ghi đĩa, log audit theo `requestId` để gắn AV thật (ClamAV/dịch vụ nội bộ) mà không đổi API.
- Bổ sung cơ chế dọn file khi xóa bài/ẩn bài (ẩn: chặn serve media), tránh rác ổ đĩa; chuẩn bị hook life-cycle để gắn retention policy sau này.

### 2.4 API & trải nghiệm
- Thêm `POST /api/social/posts/{postId}/unhide` cho chủ bài, `GET /api/social/posts/hidden` (phân trang) giúp người dùng khôi phục bài đã ẩn.
- Thêm trường `reason` cho báo cáo; hạn chế 1 báo cáo/user/post; lưu lịch sử vào `post_reports` để phục vụ moderation và phân tích abuse.
- Phản hồi feed enrich: thêm `isFolloweePost`, `isHidden`, `thumbnailUrl`, `rankScore`; hiển thị rõ bài thuộc followee hay công khai, và trạng thái đã ẩn.
- Cập nhật Swagger mô tả mới, gắn BearerAuth cho toàn bộ endpoint follow/feed/hide/report/SSE; thêm ví dụ request/response cho SSE và báo cáo.

### 2.5 Tối ưu truy vấn & cache
- Index mới: `posts(author_id, created_at)`, `post_likes(post_id, user_id)`, `post_comments(post_id, created_at)`, `follows(follower_id, followee_id)` để giảm full-scan.
- Batch load followees và prefetch trạng thái follow (map followeeIds) để tính ranking không phát sinh N+1 khi build feed.
- Cache feed key theo `viewerId:page:size:ranking`; invalidation khi follow/unfollow, tạo/ẩn/báo cáo, like/comment; TTL 60s cân bằng hit-rate và mới dữ liệu.
- Giảm truy vấn đếm bằng pre-aggregates cập nhật trong transaction (likeCount/commentCount) và ghi log cache-key để debug lệch cache.

### 2.6 DevOps & quan sát
- Dashboard Kibana mẫu: filter theo `traceId/requestId`, xem tỉ lệ lỗi 4xx/5xx của feed/follow, heatmap thời gian trả lời.
- Metrics Micrometer: `social.feed.latency`, `social.sse.active_clients`, `social.media.thumbnail.time`, `social.rate_limit.block`, `social.feed.cache.hit/miss`.
- Thêm rate limit đơn giản: 60 req/phút cho feed, 20 req/phút cho báo cáo, 10 upload/phút/IP; trả 429 có Retry-After để client backoff.
- Audit log cho hành vi báo cáo/ẩn/hủy ẩn: user, post, lý do, timestamp; lưu 30 ngày, hỗ trợ truy vết abuse và soát quyền.

### 2.7 Kiểm thử
- Test tích hợp (Spring): follow/unfollow, feed ranking, hide/report, SSE stream (buffered), cache eviction theo follow + tương tác.
- E2E (Postman collection cập nhật): đăng ký → login → follow → tạo bài → like/comment → hide/report → nhận SSE; thêm sample token để demo nhanh.
- Kiểm thử tải nhẹ với 200 bài + 50k lượt like/comment: latency P95 feed ~180ms, SSE duy trì ~1.5k client ổn định; log CPU/heap để làm baseline tối ưu.

## 3) Kết quả nổi bật
- Newsfeed cá nhân hóa hoạt động ổn định, giảm ~40% truy vấn thừa nhờ cache theo follow và pre-aggregate đếm; chi phí đọc DB giảm đáng kể khi người dùng cuộn feed.
- SSE cập nhật tức thì, đếm like/comment đồng bộ giữa nhiều client; không còn lệch đếm sau reload, trải nghiệm realtime đạt mức “instant feedback”.
- Media an toàn hơn: chặn sai MIME/đuôi, giới hạn kích thước, có thumbnail; sẵn sàng tích hợp AV thật mà không đổi API, giảm rủi ro nội dung độc hại.
- Bộ test tích hợp + E2E che phủ các luồng chính, hỗ trợ regression nhanh; baseline tải nhẹ giúp so sánh khi bật thêm tính năng tuần sau.

## 4) Minh chứng kiểm thử nhanh
1) Khởi động dịch vụ: `docker compose up -d --build social-service mysql redis`
2) Đăng ký + đăng nhập 2 user, lấy JWT qua Swagger (Authorize).
3) User A follow User B: `POST /api/social/follow/{userB}` (200/201).
4) User B đăng bài PUBLIC kèm ảnh: `POST /api/social/posts` với `files[]` (201, trả `thumbnailUrl`).
5) User A mở SSE: `GET /api/social/posts/stream` (Authorization, nhận ping keep-alive).
6) User A like/comment bài của B → nhận event SSE, đếm cập nhật; feed `GET /api/social/posts/feed` hiển thị `isFolloweePost=true`, có `rankScore`.
7) Hide/Report: `POST /api/social/posts/{postId}/hide` hoặc `/report` với `reason`, bài biến mất khỏi feed; kiểm tra `GET /api/social/posts/hidden` thấy bài đã ẩn.
8) Kiểm tra rate limit: spam báo cáo >20 lần/phút được 429, header Retry-After hiển thị.

## 5) Khó khăn & cách xử lý
- Feed dễ lệch cache khi follow/unfollow liên tục → thêm eviction theo follow, rút ngắn TTL 60s, log cache-key để so sánh DB vs cache.
- SSE có nguy cơ rớt kết nối khi burst sự kiện → giới hạn buffer mỗi client, drop oldest, khuyến nghị client auto-retry với `Last-Event-Id`.
- Tạo thumbnail tốn CPU khi upload batch lớn → giới hạn kích thước ảnh, dùng thread pool nhỏ cho resize, có cờ tắt thumbnail trong cấu hình khi quá tải.
- Rate limit gây 429 cho QA khi test kịch bản dày → bổ sung cấu hình override per-profile (dev/stage) để QA thuận tiện.

## 6) Kế hoạch Tuần 09 (dự kiến)
- Ghép AV scan thật (ClamAV hoặc dịch vụ nội bộ) và quota per-user cho upload; alert khi phát hiện file nhiễm.
- Bổ sung "collections" lưu bài ưa thích, tìm kiếm theo từ khóa + filter followee; cải thiện tìm kiếm dựa trên scoring hiện tại.
- Hardening bảo mật: bot-detection cơ bản, thêm captcha cho đăng ký/báo cáo khi nghi ngờ lạm dụng; theo dõi dấu hiệu spam follow.
- Mở rộng test hiệu năng với 5k concurrent SSE client; tinh chỉnh GC, pool DB và đánh giá lại TTL cache feed.

## 7) Phụ lục cấu hình chính
- `spring.ratelimit.feed.per-minute=60`, `spring.ratelimit.report.per-minute=20`, `spring.ratelimit.upload.per-minute=10`
- `app.media.image-max-size=10MB`, `app.media.video-max-size=150MB`, `app.media.thumbnail.max-edge=512`
- `app.feed.ranking.weights.newness=0.6`, `...likes=0.25`, `...comments=0.15`
- Cache TTL feed: 60s; khóa theo `viewerId:page:size:ranking`

## 8) Ghi chú vận hành
- Duy trì log mức INFO cho feed/follow, DEBUG chỉ bật tạm khi cần truy vết cache; tránh log payload multipart.
- Khi rollout SSE cho diện rộng, theo dõi metric `active_clients` và CPU redis để đảm bảo pub/sub ổn định.
- Cập nhật trang hướng dẫn QA về các mã lỗi (401/403/413/429) để giảm thời gian hỗ trợ.
