# API Usage Guide (Law Service)

This guide explains what each endpoint does, how to call it, and gives example requests/responses. Use it together with Swagger UI for live testing.

- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Base URL: http://localhost:8080

General
- Date filter: `effectiveAt` uses `YYYY-MM-DD` (e.g., `2024-01-01`). Use as a query param for `/api/qa` and as a JSON field for `/api/qa/gen`.
- Paging (when available): `page` (0-based), `size`.
- Admin endpoints require header `X-API-KEY`.

---

## 1) Laws

### GET /api/laws
Purpose
- List laws with optional paging.

Query params
- `page` (number, optional)
- `size` (number, optional)

Example request
```
GET /api/laws?page=0&size=10
```

Example response (shape)
```json
{
  "content": [
    {
      "id": 1,
      "code": "52/2014/QH13",
      "title": "Luật Hôn nhân và Gia đình",
      "effectiveDate": "2015-01-01"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1
}
```

### GET /api/laws/{id}
Purpose
- Get law details by id.

Path params
- `id` (number)

Example request
```
GET /api/laws/1
```

### GET /api/laws/search
Purpose
- Search laws by keyword (title/metadata).

Query params
- `keyword` (string, required)
- `page` (number, optional)
- `size` (number, optional)

Example request
```
GET /api/laws/search?keyword=hon%20nhan&page=0&size=10
```

### GET /api/laws/suggest
Purpose
- Autocomplete law titles/codes.

Query params
- `keyword` (string, required)
- `limit` (number, optional, default 10, max 50)

Example request
```
GET /api/laws/suggest?keyword=hon&limit=10
```

---

## 2) Law Nodes

### GET /api/laws/{lawId}/nodes
Purpose
- List nodes (Điều/Khoản/Mục) of a law; supports temporal filtering.

Path params
- `lawId` (number)

Query params
- `effectiveAt` (string, optional, `YYYY-MM-DD`)

Example request
```
GET /api/laws/1/nodes?effectiveAt=2024-01-01
```

### GET /api/nodes/{id}
Purpose
- Get a single node by id.

Path params
- `id` (number)

Example request
```
GET /api/nodes/1
```

### GET /api/nodes/search
Purpose
- Keyword search in node content/heading.

Query params
- `keyword` (string, required)
- `effectiveAt` (string, optional, `YYYY-MM-DD`)
- `page` (number, optional)
- `size` (number, optional)

Example request
```
GET /api/nodes/search?keyword=ket%20hon&effectiveAt=2024-01-01&page=0&size=10
```

### GET /api/nodes/search/fulltext
Purpose
- Full‑text search with highlight (requires MySQL FULLTEXT index).

Query params
- `q` (string, required)
- `page` (number, optional)
- `size` (number, optional)

Example request
```
GET /api/nodes/search/fulltext?q=ket%20hon&page=0&size=10
```

---

## 3) RAG QA

### POST /api/qa
Purpose
- Ask a question; the service forwards to the RAG service and returns a concise answer with legal context items.

Consumes
- `application/json` (recommended), or `text/plain` (question string only)

JSON body
- `question` (string, required)

Query params
- `effectiveAt` (string, optional, `YYYY-MM-DD`)

Example body
```json
{
  "question": "Điều kiện kết hôn là gì?"
}
```

Example response (shape)
```json
{
  "answer": "Trả lời rất gọn dựa trên trích dẫn...",
  "effective_at": "2024-01-01",
  "context": [
    {
      "law_code": "52/2014/QH13",
      "node_path": "/52/2014/QH13/Dieu-8/Khoan-1",
      "node_id": 123,
      "content": "Nam đủ 20 tuổi..."
    }
  ]
}
```

### POST /api/qa/gen
Purpose
- Generate answer with explicit citations and used node ids (for UI linking/analytics).

Consumes
- `application/json`

JSON body
- `question` (string, required)
- `effectiveAt` (string, optional, `YYYY-MM-DD`)
- `k` (number, optional, how many contexts to retrieve, e.g., 8)
- `maxTokens` (number, optional)
- `temperature` (number, optional)

Example body
```json
{
  "question": "Điều kiện kết hôn là gì?",
  "effectiveAt": "2024-01-01",
  "k": 8
}
```

Example response (shape)
```json
{
  "answer": "Trả lời rất gọn dựa trên trích dẫn...",
  "citations": [
    { "law_code": "52/2014/QH13", "node_path": "/52/2014/QH13/Dieu-8", "node_id": 100 },
    { "law_code": "52/2014/QH13", "node_path": "/52/2014/QH13/Dieu-8/Khoan-1", "node_id": 101 }
  ],
  "used_nodes": [100, 101]
}
```

---

## 4) Admin

### POST /api/admin/reindex
Purpose
- Trigger re-embedding pipeline in the RAG service (currently a stub that accepts the request). Protect this endpoint with an admin API key.

Headers
- `X-API-KEY` (required; configure via `security.admin.api-key`)

Body
- none

Example
```
POST /api/admin/reindex
X-API-KEY: your-admin-key
```

Response
```
202 Accepted
{
  "status": "accepted"
}
```

---

## 5) Health and Metrics

### GET /actuator/health
Purpose
- Liveness/health probe.

### GET /actuator/health/readiness
Purpose
- Readiness probe (is the service ready to receive traffic?).

### GET /actuator/prometheus
Purpose
- Prometheus metrics endpoint for law-service.

Notes
- For rag-service metrics, use `GET http://localhost:5001/metrics`.

---

## Kiểm thử

Cách nhanh để chạy test tự động và kiểm thử khói (smoke test) API trên máy local.

### 1) Chạy test (Maven)

```
# Từ thư mục gốc repo
mvn -f services/law-service test

# Build bỏ qua test
mvn -f services/law-service clean package -DskipTests
```

Khắc phục sự cố (JUnit/WebMvc): nếu dùng `@WebMvcTest` và gặp 403 do filter bảo mật, thêm `@AutoConfigureMockMvc(addFilters = false)` hoặc import cấu hình bảo mật vào test slice.

### 2) Chạy dịch vụ cục bộ

```
# Build JAR
mvn -f services/law-service clean package -DskipTests

# Chạy (điền thông tin DB phù hợp)
java -jar services/law-service/target/law-service-0.0.1-SNAPSHOT.jar \
  --spring.datasource.url=jdbc:mysql://host.docker.internal:3307/laws \
  --spring.datasource.username=root \
  --spring.datasource.password=your-pass
```

Hoặc chạy toàn bộ stack bằng Docker Compose từ thư mục gốc repo:

```
docker compose up --build
```

### 3) Kiểm thử nhanh với curl

```
# Laws
curl "http://localhost:8080/api/laws?page=0&size=5"
curl "http://localhost:8080/api/laws/1"
curl "http://localhost:8080/api/laws/search?keyword=hon&page=0&size=5"
curl "http://localhost:8080/api/laws/suggest?keyword=hon&limit=10"

# Nodes
curl "http://localhost:8080/api/laws/1/nodes?effectiveAt=2024-01-01"
curl "http://localhost:8080/api/nodes/1"
curl "http://localhost:8080/api/nodes/search?keyword=ket%20hon&effectiveAt=2024-01-01&page=0&size=5"
curl "http://localhost:8080/api/nodes/search/fulltext?q=ket%20hon&page=0&size=5"

# QA (RAG)
curl -X POST "http://localhost:8080/api/qa?effectiveAt=2024-01-01" \
  -H "Content-Type: application/json" \
  -d '{"question":"Dieu kien ket hon la gi?"}'

curl -X POST "http://localhost:8080/api/qa/gen" \
  -H "Content-Type: application/json" \
  -d '{"question":"Dieu kien ket hon la gi?","effectiveAt":"2024-01-01","k":8}'

# Admin (cần API key)
curl -X POST "http://localhost:8080/api/admin/reindex" \
  -H "X-API-KEY: your-admin-key"
```

### 4) Postman

- Import collection: `postman/Law Service.postman_collection.json`.
- Thiết lập biến `baseUrl` (mặc định: `http://localhost:8080`).
- Thử các request: Laws, Nodes, QA, và endpoint mới `Suggest Laws`.
