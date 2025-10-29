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

1) Chạy script nhúng

```powershell
docker compose exec rag-service python /app/embed_laws.py
```

Lưu ý schema: Flyway tạo cột mã luật là `laws.code`. Nếu script của bạn dùng `laws.law_code`, hãy sửa lại truy vấn trong `embed_laws.py` thành `l.code AS law_code` hoặc điều chỉnh cho phù hợp với schema hiện tại trước khi chạy.

## Swagger và Postman
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Postman collection: `postman/Law Service.postman_collection.json`

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

