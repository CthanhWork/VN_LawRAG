# VN Law RAG Starter

Hệ thống demo RAG pháp luật Việt Nam với các thành phần:

- `mysql`: MySQL 8 lưu trữ dữ liệu luật, điều/khoản.
- `redis`: cache / pub-sub cho các service.
- `chroma`: ChromaDB (vector store) lưu embeddings.
- `rag-service`: dịch vụ Python/Flask thực hiện RAG (retrieve + phân tích + gọi LLM).
- `law-service`: Spring Boot cung cấp API luật, TOC, QA và gọi `rag-service`.
- `social-service`: Spring Boot cho các tính năng mạng xã hội pháp lý (demo).
- `Lawer_UI`: giao diện web React (Vite) tương tác với backend.

File điều phối chính: `docker-compose.yml` ở thư mục gốc.

---

## 1. Tóm tắt trạng thái bạn đang gặp

- Bảng `law_nodes` trong MySQL đã có ~2900 bản ghi → **dữ liệu luật đã import OK**.
- Service `seed-pdfs` log:
  - Đã import các file PDF trong thư mục gốc.
  - Đã “Embedding laws into Chroma... Loaded 1177 chunks / Upsert to Chroma done.” → **Chroma có dữ liệu**.
- Tuy nhiên, khi gọi `POST /analyze` từ `rag-service`, response là:
  - `"context": []` → **không có đoạn luật nào được retrieve** cho câu hỏi của bạn.

Đây là tình trạng:

- Hệ thống (Docker, MySQL, Chroma, RAG) **chạy ổn**, seed/embedding **thành công**.
- Nhưng **corpus hiện tại không chứa Luật Hôn nhân và Gia đình** (và nghị định xử phạt tương ứng), nên RAG không tìm được ngữ cảnh phù hợp cho tình huống “một vợ một chồng”, dẫn đến `decision="UNCERTAIN"` dù code đã được chỉnh để quyết liệt hơn.

Để hệ thống trả lời đúng “câu luật” về chế độ hôn nhân một vợ một chồng, bạn cần:

1. Thêm đúng các file luật liên quan vào thư mục gốc.
2. Seed lại và embed lại vào Chroma.
3. Gọi lại các API QA / analyze.

Phần dưới đây là hướng dẫn đầy đủ để chạy và test hệ thống trơn tru từ đầu.

---

## 2. Chuẩn bị môi trường

Yêu cầu:

- Docker Desktop + Docker Compose.
- (Khuyến nghị) JDK 17 + Maven nếu muốn build JAR trước khi build image.
- Node.js >= 18 để chạy `Lawer_UI` (React + Vite).
- Các cổng trống trên máy host:
  - `3307` (MySQL)
  - `6379` (Redis)
  - `8008` (Chroma – optional)
  - `5001` (`rag-service`)
  - `8080` (`law-service`)
  - `8082` (`social-service`)
  - `5173` (Vite dev server cho `Lawer_UI`)

---

## 3. Chuẩn bị dữ liệu luật (cực quan trọng)

Đặt các file PDF luật vào **thư mục gốc** repo `vnlaw-rag-starter` (cùng chỗ với `docker-compose.yml`). Ví dụ:

- `luat_hon_nhan_va_gia_dinh_2014.pdf` (bản hợp nhất càng tốt).
- `nghi_dinh_xu_phat_hon_nhan_gia_dinh.pdf` (ví dụ NĐ 82/2020/NĐ-CP hoặc văn bản mới hơn).
- Các văn bản khác mà bạn muốn hệ thống hiểu (đã có sẵn một số file mẫu trong repo).

Service `seed-pdfs` sẽ đọc **tất cả PDF trong thư mục gốc** khi khởi chạy để:

- Import cấu trúc luật vào MySQL (`law_service` dùng).
- Cắt thành các đoạn (chunks) và embed vào Chroma (`rag-service` dùng).

---

## 4. Khởi động toàn bộ backend (Docker Compose)

Tại thư mục gốc repo (`vnlaw-rag-starter`):

```powershell
docker compose up --build -d
```

Lệnh này sẽ:

- Khởi động MySQL, Redis, Chroma.
- Build và chạy:
  - `rag-service` trên `http://localhost:5001`
  - `law-service` trên `http://localhost:8080`
  - `social-service` trên `http://localhost:8082`
- Chạy service `seed-pdfs` **một lần** để:
  - Import các file PDF ở thư mục gốc vào MySQL.
  - Embed nội dung và đẩy vào Chroma (qua `tools/embed_laws_plus.py`).

Kiểm tra nhanh trạng thái container:

```powershell
docker compose ps
```

Kiểm tra các endpoint chính (PowerShell):

```powershell
# RAG sẵn sàng?
Invoke-RestMethod "http://localhost:5001/ready"

# law-service readiness (Spring Actuator)
Invoke-RestMethod "http://localhost:8080/actuator/health/readiness"

# social-service (nếu bật actuator)
Invoke-RestMethod "http://localhost:8082/actuator/health"  # nếu đã cấu hình
```

Lưu ý: healthcheck trong `docker-compose.yml` của `law-service` dùng `curl` bên trong container JRE nên đôi khi `docker compose ps` vẫn báo `unhealthy` dù API đã chạy; hãy ưu tiên kiểm tra readiness qua HTTP như trên.

---

## 5. Kiểm tra seed & embedding

Xem log của `seed-pdfs` để chắc chắn luật đã được import và embed:

```powershell
docker compose logs seed-pdfs
```

Bạn nên thấy log tương tự:

- `Import: /seed/xxx.pdf` + `Imported law 'XXX' (id=Y) with ... điều and ... khoản.`
- `Embedding laws into Chroma...`
- `Loaded N chunks`
- `Upsert to Chroma done.`

Nếu muốn ép embed lại (rebuild index Chroma) sau này:

```powershell
docker compose exec rag-service bash -lc "python tools/embed_laws_plus.py --rebuild"
```

Khi đó console sẽ in `Loaded N chunks` và hoàn tất nếu không có lỗi.

---

## 6. Gọi trực tiếp RAG để kiểm tra `context`

Để xem chính xác RAG đang retrieve những đoạn luật nào cho câu hỏi, gọi thẳng `rag-service`:

1. Tạo file `analyze_body.json` ở thư mục gốc, ví dụ:

   ```json
   {
     "question": "Anh A và chị B kết hôn năm 2018, có đăng ký kết hôn hợp pháp tại Ủy ban nhân dân phường X...",
     "effective_at": "2024-01-01",
     "options": { "k": 8 }
   }
   ```

2. Chạy trong PowerShell (VS Code terminal):

   ```powershell
   curl.exe -X POST "http://localhost:5001/analyze" ^
     -H "Content-Type: application/json; charset=utf-8" ^
     --data-binary "@analyze_body.json"
   ```

   (Hoặc một dòng nếu bạn thích: `curl.exe -X POST ... --data-binary "@analyze_body.json"`)

3. Response mẫu:

   ```json
   {
     "answer": "...",
     "decision": "VIOLATION|NO_VIOLATION|UNCERTAIN",
     "explanation": "...",
     "citations": [...],
     "effective_at": "2024-01-01",
     "context": [
       {
         "law_code": "LUAT/HON/NHAN/VA/GIA/DINH",
         "node_path": "Điều 5 ...",
         "node_id": 123,
         "content": "Nội dung điều luật ...",
         "doc_type": "LAW"
       },
       ...
     ],
     "used_nodes": [123, ...]
   }
   ```

- Nếu `context` là **mảng rỗng (`[]`)**: Chroma không có đoạn nào phù hợp (hoặc index rỗng). Kiểm tra lại bước 3–5 và corpus PDF (có chứa luật bạn cần hay chưa).
- Nếu `context` có các đoạn luật nhưng `decision` vẫn `UNCERTAIN`: khi đó cần chỉnh thêm logic RAG/LLM (đã được tăng cường trong `analysis_llm.py`) hoặc thêm rule-based.

---

## 7. Gọi QA/analyze qua law-service (Swagger)

Sau khi đảm bảo RAG hoạt động tốt, sử dụng API chuẩn của `law-service`:

- Swagger UI: `http://localhost:8080/swagger-ui.html`

Các endpoint chính:

- `POST /api/qa`
  - Body JSON: `{"question": "Điều kiện kết hôn là gì?"}`
  - Option `effectiveAt=YYYY-MM-DD` qua query param nếu cần.
  - Trả về câu trả lời + context (qua law-service).

- `POST /api/qa/gen`
  - Sinh câu trả lời có trích dẫn.

- `POST /api/qa/analyze`
  - Chuẩn hóa phân tích tình huống (decision + giải thích + citations).
  - Chính endpoint này gọi `rag-service /analyze` bên dưới.


Ví dụ PowerShell (gọi law-service trực tiếp):

```powershell
$body = @{
  question = "Điều kiện kết hôn là gì?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/qa" -Method Post -ContentType "application/json" -Body $body
```

---

## 8. Giao diện web Lawer_UI

Trong terminal khác:

```powershell
cd Lawer_UI
npm install
npm run dev
```

- Vite mặc định chạy tại: `http://localhost:5173`
- UI gọi backend:
  - `law-service`: `http://localhost:8080`
  - `social-service`: `http://localhost:8082` (nếu có dùng)

Nếu bị lỗi CORS từ UI, cấu hình lại biến `CORS_ALLOW_ORIGINS` trong `.env` (ví dụ `*` cho dev) rồi:

```powershell
docker compose up -d rag-service law-service social-service
```

---

## 9. Một số lệnh hữu ích / debug

Kiểm tra logs của từng service:

```powershell
docker compose logs rag-service
docker compose logs law-service
docker compose logs seed-pdfs
```

Force re-embed luật vào Chroma:

```powershell
docker compose exec rag-service bash -lc "python tools/embed_laws_plus.py --rebuild"
```

Kiểm tra tình trạng LLM trong `rag-service`:

```powershell
Invoke-RestMethod "http://localhost:5001/llm/status"
```

Nếu bạn muốn mình hỗ trợ tune thêm prompt/logic để ra kết luận rõ hơn cho các tình huống cụ thể (như chế độ một vợ một chồng), chỉ cần gửi thêm ví dụ câu hỏi + `context` từ `/analyze`. 

