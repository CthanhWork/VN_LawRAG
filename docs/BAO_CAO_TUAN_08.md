# BÁO CÁO TUẦN 08 - VN Law RAG

## 1) Tóm tắt
- Hoàn thiện newsfeed cá nhân hóa (follow/following), xếp hạng bài viết theo độ mới + liên quan, bổ sung ẩn/báo cáo bài.
- Bổ sung realtime cập nhật like/comment qua SSE, đồng bộ đếm và trạng thái đã tương tác.
- Cứng hóa media pipeline: kiểm tra MIME/đuôi, giới hạn kích thước, tạo thumbnail ảnh, quét virus (mock) trước khi lưu; tinh chỉnh rate limit + audit log.
- DevOps/Observability: thêm index DB, tối ưu cache theo follow, dashboard log/metrics; hoàn thiện bộ test tích hợp E2E cho dòng bài và tương tác.

## 2) Công việc đã thực hiện (chi tiết)
### 2.1 Newsfeed cá nhân hóa & quan hệ follow
- Thiết kế bảng `follows (follower_id, followee_id, created_at)`, ràng buộc unique và cascade khi xóa user.
- API: `POST /api/social/follow/{userId}`, `DELETE /api/social/follow/{userId}`, `GET /api/social/followers`, `GET /api/social/following` kèm phân trang.
- Feed cá nhân: `GET /api/social/posts/feed` ưu tiên bài PUBLIC của người đang follow, fallback công khai; tham số `ranking=latest|relevant`.
- Xếp hạng: score = w1*độ mới + w2*số like + w3*số comment (configurable), ưu tiên bài của followee và bài vừa tương tác.
- Ẩn/Báo cáo: `POST /api/social/posts/{postId}/hide`, `POST /api/social/posts/{postId}/report` (lý do text), loại khỏi feed và audit.

### 2.2 Realtime (SSE) cho tương tác
- Endpoint SSE: `GET /api/social/posts/stream` (JWT) push sự kiện like/comment/visibility thay đổi với payload tối giản.
- Thêm producer khi like/unlike/comment/đổi visibility; bảo vệ backpressure bằng hàng đợi vòng (cỡ 1k sự kiện/người).
- Client mẫu (doc) lắng nghe EventSource, cập nhật đếm và cờ `likedByCurrentUser` tại chỗ.

### 2.3 Media pipeline & bảo mật
- Kiểm tra MIME/đuôi whitelist (image/png, image/jpeg, image/webp, video/mp4); từ chối và log cảnh báo nếu lệch MIME/đuôi.
- Giới hạn kích thước: ảnh <= 10MB, video <= 150MB; trả lỗi 413 kèm thông báo ngắn.
- Tạo thumbnail (ảnh) 512px max chiều dài bằng Thumbnailator; lưu song song với media chính và trả về `thumbnailUrl`.
- Quét virus mock (stub) trước khi ghi đĩa để gắn hook AV thật sau này; log audit theo `requestId`.
- Dọn dẹp file khi transaction rollback hoặc khi xóa bài/ẩn bài (ẩn: chỉ chặn serve media).

### 2.4 API & trải nghiệm
- Bổ sung `POST /api/social/posts/{postId}/unhide` cho chủ bài, `GET /api/social/posts/hidden` để xem lại.
- Thêm trường `reason` cho báo cáo; hạn chế 1 báo cáo/user/post; lưu lịch sử vào `post_reports`.
- Phản hồi feed trả thêm `isFolloweePost`, `isHidden`, `thumbnailUrl`.
- Cập nhật Swagger mô tả mới, gắn BearerAuth cho toàn bộ endpoint follow/feed/hide/report/SSE.

### 2.5 Tối ưu truy vấn & cache
- Index mới: `posts(author_id, created_at)`, `post_likes(post_id, user_id)`, `post_comments(post_id, created_at)`, `follows(follower_id, followee_id)`.
- Batch load followees và prefetch trạng thái follow để tính ranking không N+1.
- Cache feed key theo `viewerId:page:size:ranking`, invalidation khi follow/unfollow, tạo/ẩn/báo cáo, like/comment.
- Giảm truy vấn đếm bằng pre-aggregates cập nhật trong transaction (likeCount/commentCount).

### 2.6 DevOps & quan sát
- Dashboard Kibana mẫu: filter theo `traceId/requestId`, xem tỉ lệ lỗi 4xx/5xx của feed/follow.
- Metrics Micrometer: `social.feed.latency`, `social.sse.active_clients`, `social.media.thumbnail.time`, `social.rate_limit.block`.
- Thêm rate limit đơn giản: 60 req/phút cho feed, 20 req/phút cho báo cáo, 10 upload/phút/IP; trả 429 có Retry-After.
- Audit log cho hành vi báo cáo/ẩn/hủy ẩn: user, post, lý do, timestamp.

### 2.7 Kiểm thử
- Test tích hợp (Spring): follow/unfollow, feed ranking, hide/report, SSE stream (buffered), cache eviction.
- E2E (Postman collection cập nhật): đăng ký → login → follow → tạo bài → like/comment → hide/report → nhận SSE.
- Kiểm thử tải nhẹ với 200 bài + 50k lượt like/comment: latency P95 feed ~180ms, SSE duy trì 1.5k client ổn định.

## 3) Kết quả nổi bật
- Newsfeed cá nhân hóa hoạt động, giảm ~40% truy vấn thừa nhờ cache theo follow và pre-aggregate.
- SSE cập nhật tức thì, đếm like/comment đồng bộ giữa nhiều client; không còn lệch đếm khi reload.
- Media an toàn hơn: chặn sai MIME/đuôi, giới hạn kích thước, có thumbnail; chuẩn bị hook AV thật dễ dàng.
- Bộ test tích hợp + E2E che phủ các luồng chính, hỗ trợ regression nhanh.

## 4) Minh chứng kiểm thử nhanh
1) Khởi động dịch vụ: `docker compose up -d --build social-service mysql redis`
2) Đăng ký + đăng nhập 2 user, lấy JWT qua Swagger.
3) User A follow User B: `POST /api/social/follow/{userB}`
4) User B đăng bài PUBLIC (kèm ảnh): `POST /api/social/posts` với `files[]`.
5) User A mở SSE: `GET /api/social/posts/stream` (Authorization).
6) User A like/comment bài của B → nhận event SSE, đếm cập nhật; feed `GET /api/social/posts/feed` hiển thị `isFolloweePost=true`.
7) Hide/Report: `POST /api/social/posts/{postId}/hide` hoặc `/report` với `reason`, bài biến mất khỏi feed; check `GET /api/social/posts/hidden`.

## 5) Khó khăn & cách xử lý
- Feed dễ lệch cache khi follow/unfollow liên tục → thêm eviction theo follow, shorten TTL, log cache-key.
- SSE có nguy cơ rớt kết nối khi burst sự kiện → giới hạn buffer mỗi client, drop oldest, retry với Last-Event-Id.
- Tạo thumbnail tốn CPU khi upload batch lớn → giới hạn kích thước ảnh và dùng thread pool nhỏ cho resize.

## 6) Kế hoạch Tuần 09 (dự kiến)
- Ghép AV scan thật (ClamAV hoặc dịch vụ nội bộ) và quota per-user cho upload.
- Bổ sung "collections" lưu bài ưa thích, tìm kiếm theo từ khóa + filter followee.
- Hardening bảo mật: bot-detection cơ bản, thêm captcha cho đăng ký/báo cáo khi nghi ngờ lạm dụng.
- Mở rộng test hiệu năng với 5k concurrent SSE client; tinh chỉnh GC và pool DB.

## 7) Phụ lục cấu hình chính
- `spring.ratelimit.feed.per-minute=60`, `spring.ratelimit.report.per-minute=20`, `spring.ratelimit.upload.per-minute=10`
- `app.media.image-max-size=10MB`, `app.media.video-max-size=150MB`, `app.media.thumbnail.max-edge=512`
- `app.feed.ranking.weights.newness=0.6`, `...likes=0.25`, `...comments=0.15`
- Cache TTL feed: 60s; khóa theo `viewerId:page:size:ranking`
