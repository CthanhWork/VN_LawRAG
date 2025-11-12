# VN Law RAG Starter

Hệ thống demo gồm 2 dịch vụ chính và hạ tầng đi kèm:

- law-service (Spring Boot) đọc dữ liệu MySQL, cung cấp API luật và gọi sang RAG
- rag-service (Flask/Python) thực hiện RAG đơn giản với Sentence Transformers + Chroma
- Hạ tầng: MySQL 8, Redis, ChromaDB (vector store)

File điều phối: `docker-compose.yml` ở thư mục gốc.

## Yêu cầu
- Docker Desktop + Docker Compose
- (Khuyến nghị) JDK 17 + Maven nếu bạn muốn build JAR trước khi chạy Docker
- Cổng trống: 3307 (MySQL), 6379 (Redis), 8008 (Chroma – tuỳ chọn), 5001 (rag-service), 8080 (law-service)

## Chạy nhanh bằng Docker Compose
1) Build JAR cho law-service (khuyên dùng để image build nhanh và chắc chắn có JAR)

   ```powershell
   mvn -f services/law-service clean package -DskipTests
   ```

2) Dựng toàn bộ dịch vụ

   ```powershell
   docker compose up --build -d
   ```

3) Kiểm tra tình trạng (PowerShell)

   ```powershell
   # RAG sẵn sàng?
   Invoke-RestMethod "http://localhost:5001/ready"

   # Prometheus metrics từ rag-service
   Invoke-RestMethod "http://localhost:5001/metrics"

   # law-service readiness (Spring Actuator)
   Invoke-RestMethod "http://localhost:8080/actuator/health/readiness"

   # Trạng thái container
   docker compose ps
   ```

Lưu ý: healthcheck của law-service trong compose dùng `curl` (image JRE mặc định không có `curl`), nên cột STATUS đôi khi báo "unhealthy" dù API vẫn hoạt động. Hãy ưu tiên kiểm tra readiness qua HTTP như trên.

## Gọi thử API (PowerShell)
Mẹo hiển thị tiếng Việt đúng trong console Windows:

```powershell
chcp 65001
[Console]::OutputEncoding = [Text.Encoding]::UTF8
```

- Liệt kê luật

  ```powershell
  Invoke-RestMethod "http://localhost:8080/api/laws"
  ```

- Tìm kiếm luật

  ```powershell
  Invoke-RestMethod "http://localhost:8080/api/laws/search?keyword=hon%20nhan"
  ```

- Mục lục (TOC) của 1 luật

  ```powershell
  Invoke-RestMethod "http://localhost:8080/api/laws/1/toc"
  ```

- Tìm kiếm full‑text (cần FULLTEXT index – đã tạo trong Flyway V2)

  ```powershell
  Invoke-RestMethod "http://localhost:8080/api/nodes/search/fulltext?q=ket%20hon&page=0&size=10"
  ```

- Hỏi đáp RAG (JSON body)

  ```powershell
  $body = @{ question = "Điều kiện kết hôn là gì?" } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:8080/api/qa" -Method Post -ContentType "application/json" -Body $body
  ```

- Hỏi đáp RAG (text/plain)

  ```powershell
  Invoke-RestMethod -Uri "http://localhost:8080/api/qa" -Method Post -ContentType "text/plain" -Body "Điều kiện kết hôn là gì?"
  ```

- Sinh câu trả lời có trích dẫn (/api/qa/gen)

  ```powershell
  $g = @{ question = "Điều kiện kết hôn là gì?"; k = 8 } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:8080/api/qa/gen" -Method Post -ContentType "application/json" -Body $g
  ```

Ghi chú PowerShell: `curl` trong PowerShell là alias của `Invoke-WebRequest` và không hiểu `-H`/`-d` dạng Unix. Nếu thích dùng `curl` kiểu Unix, hãy gọi `curl.exe` thay vì `curl`.

## Nhúng dữ liệu vào Chroma (tăng chất lượng trả lời)
Mặc định Chroma có thể trống, câu trả lời sẽ ít ngữ cảnh. Hãy chạy script nhúng để tạo embeddings từ DB và đưa vào Chroma.

1) Chép script nhúng vào container `rag-service` (script ở repo: `tools/embed_laws.py`)

```powershell
docker compose cp tools/embed_laws.py rag-service:/app/embed_laws.py
```

2) Chạy script trong container `rag-service`

```powershell
docker compose exec rag-service bash -lc "DB_HOST=mysql DB_PORT=3306 DB_NAME=laws DB_USER=app DB_PASS=app CHROMA_PATH=/data/chroma python /app/embed_laws.py"
```

## Cấu hình & kiểm tra Gemini LLM
- Thiết lập `GEMINI_API_KEY` trong `.env` (xem `.env.example`) và giữ `QU_MODEL=gemini-1.5-flash` hoặc model tương thích.
- Bật/tắt Query Understanding qua `USE_LLM_QU=true|false`; cả `/qa/analyze` vẫn dùng Gemini nếu có khóa để đưa ra phán quyết.
- Khởi chạy lại `rag-service` sau khi thay đổi khóa hoặc model để `google-generativeai` nhận cấu hình mới.
- Kiểm tra nhanh: `Invoke-RestMethod "http://localhost:5001/llm/status"` (trả về `ready`, `provider`, `has_api_key`, ...).
- Kiểm tra sâu (gửi 1 yêu cầu thực tế tới Gemini): `Invoke-RestMethod "http://localhost:5001/llm/status?live=true"` – chỉ chạy khi bạn muốn xác nhận khóa hợp lệ; sẽ trả HTTP 503 nếu lỗi.
- Ghi log yêu cầu/đáp ứng LLM bằng `LLM_DEBUG=true` và `LLM_LOG_SLICE=4000` (giới hạn ký tự log).

### Bổ sung Nghị định (decrees) cho Luật HN&GĐ
- Schema hỗ trợ `doc_type` (LAW/DECREE) và liên kết `related_law_id` để gắn nghị định với luật cơ sở (ví dụ 52/2014/QH13).
- Dùng `tools/import_pdf.py` với `--doc-type DECREE --related-law-code 52/2014/QH13` để nhập nghị định.
- Xem hướng dẫn chi tiết và lệnh mẫu tại `docs/decrees/README.md`.

## Swagger và Postman
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Postman collection: `postman/Law Service.postman_collection.json`

## Viewer web đơn giản
- File: `web/viewer.html`
- Chạy nhanh: `python -m http.server 3000` rồi mở http://localhost:3000/web/viewer.html
- Yêu cầu: law-service chạy ở http://localhost:8080

## Khắc phục sự cố
- 400 khi gọi `/api/qa` (JSON): kiểm tra body JSON có trường `question` chưa. In lỗi chi tiết:

  ```powershell
  try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/qa" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
  } catch {
    $resp = $_.Exception.Response
    $reader = New-Object IO.StreamReader($resp.GetResponseStream())
    $reader.ReadToEnd()
  }
  ```

- Lỗi Flyway Unsupported Database: đã được xử lý bằng cách thêm dependency `org.flywaydb:flyway-mysql`. Hãy `mvn clean package` rồi `docker compose up --build` lại.

- Resync DB/Chroma (xoá dữ liệu):

  Cảnh báo: thao tác này xoá toàn bộ dữ liệu MySQL/Chroma trong volumes.

  ```powershell
  docker compose down -v
  mvn -f services/law-service clean package -DskipTests
  docker compose up --build -d
  ```

## Chạy local (tuỳ chọn)
- Hạ tầng bằng Docker: `docker compose up -d mysql redis chroma`
- RAG local:

  ```powershell
  cd services/rag-service
  pip install -r requirements.txt
  $env:RAG_HOST = "0.0.0.0"; $env:RAG_PORT = "5001"; $env:CHROMA_PATH = ".\chroma"
  python app.py
  ```

- law-service local:

  ```powershell
  mvn -f services/law-service spring-boot:run
  ```

Cấu hình mặc định đã trỏ tới `localhost:3307` (MySQL) và `localhost:5001` (RAG) cho chế độ local.


## External AI Analyzer Workflow (draft)
- G?i m� t? t�nh hu?ng d�i l�n LLM ngo�i (OpenAI, Claude, Gemini...) d? tr�ch s? ki?n ch�nh.
- D?a k?t qu? tr�ch k?t h?p patterns (services/rag-service/domain_patterns.json) d? d?nh d?ng h�nh vi v� g?i � di?u lu?t.
- V?i m?i h�nh vi, sinh truy v?n chu?n, g?i RAG (retrieve2) d? l?y tr�ch d?n.
- �ua ng? c?nh v�o LLM (open-book) d? k?t lu?n VIOLATION | NO_VIOLATION | UNCERTAIN k�m gi?i th�ch v� citation.
- Xem skeleton: services/rag-service/external_analyzer.py, API tham chi?u: POST /analyze.

