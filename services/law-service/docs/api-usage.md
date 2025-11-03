# API Usage Guide (Law Service)

This guide reflects the current Java controllers and DTOs. It explains each endpoint, parameters, and example requests/responses. Use together with Swagger UI for live testing.

- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Base URL: http://localhost:8080

General
- Date filter: `effectiveAt` uses `YYYY-MM-DD` (e.g., `2024-01-01`). For QA: query param on `/api/qa` and JSON field on `/api/qa/gen`.
- Paging (when available): `page` (0-based), `size`. Node endpoints return `PageResponse<T>`: `content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`, `first`, `last`.
- Admin endpoints require `X-API-KEY` when `security.admin.api-key` is configured.

---

## 1) Laws

### GET /api/laws
Purpose
- List all laws. Returns an array (no paging on this endpoint).

Query params
- none

Example request
```
GET /api/laws
```

Example response (array)
```json
[
  {
    "id": 1,
    "code": "121/VBHN-VPQH",
    "title": "Văn bản hợp nhất 121/VBHN-VPQH"
  }
]
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

Response
- Spring Data `Page<Law>` (standard Spring page JSON), including keys like `content`, `pageable`, `size`, `number`, `totalElements`, `totalPages`, `first`, `last`.

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

Notes
- The `type` field in suggestion results reflects document type, e.g. `LAW` or `DECREE`.

### GET /api/suggestions
Purpose
- Global autocomplete (currently returns law suggestions; same shape as `/api/laws/suggest`).

Query params
- `keyword` (string, required)

Example request
```
GET /api/suggestions?keyword=121
```

Notes
- Currently returns law documents (including decrees) with `type` set to `LAW` or `DECREE`.

---

## 2) Law Nodes

### GET /api/laws/{lawId}/nodes
Purpose
- List nodes (Điều/Khoản/Mục) of a law; supports temporal filtering.

Path params
- `lawId` (number)

Query params
- `effectiveAt` (string, optional, `YYYY-MM-DD`)
- `page` (number, optional)
- `size` (number, optional)

Example request
```
GET /api/laws/1/nodes?effectiveAt=2019-01-01&page=0&size=20
```

Response
- `PageResponse<LawNode>` with `content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`, `first`, `last`.

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
GET /api/nodes/search?keyword=ket%20hon&effectiveAt=2019-01-01&page=0&size=10
```

Response
- `PageResponse<LawNode>` (see fields above).

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

Response
- `PageResponse<NodeSearchDTO>` where each item includes `id`, `lawId`, `level`, `ordinalLabel`, `heading`, `snippet` (HTML with `<mark>` tags).

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
  "answer": "Trả lời rút gọn...",
  "effectiveAt": "2019-01-01",
  "context": [
    {
      "content": "Nam từ đủ 20 tuổi...",
      "lawCode": "121/VBHN-VPQH",
      "nodePath": "/121/VBHN-VPQH/Dieu-8/Khoan-1",
      "nodeId": 101,
      "effectiveStart": "2015-01-01",
      "effectiveEnd": "2099-12-31"
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
  "answer": "Trả lời rút gọn...",
  "citations": [
    { "lawCode": "121/VBHN-VPQH", "nodePath": "/121/VBHN-VPQH/Dieu-8", "nodeId": 100 },
    { "lawCode": "121/VBHN-VPQH", "nodePath": "/121/VBHN-VPQH/Dieu-8/Khoan-1", "nodeId": 101 }
  ],
  "effectiveAt": "2019-01-01",
  "usedNodes": [100, 101]
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
- `202 Accepted` with empty body.

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
curl "http://localhost:8080/api/laws"
curl "http://localhost:8080/api/laws/1"
curl "http://localhost:8080/api/laws/search?keyword=hon&page=0&size=5"
curl "http://localhost:8080/api/laws/suggest?keyword=hon&limit=10"
curl "http://localhost:8080/api/suggestions?keyword=121"

# Nodes
curl "http://localhost:8080/api/laws/1/nodes?effectiveAt=2019-01-01&page=0&size=20"
curl "http://localhost:8080/api/nodes/1"
curl "http://localhost:8080/api/nodes/search?keyword=ket%20hon&effectiveAt=2019-01-01&page=0&size=5"
curl "http://localhost:8080/api/nodes/search/fulltext?q=ket%20hon&page=0&size=5"

# QA (RAG)
curl -X POST "http://localhost:8080/api/qa?effectiveAt=2019-01-01" \
  -H "Content-Type: application/json" \
  -d '{"question":"Dieu kien ket hon la gi?"}'

curl -X POST "http://localhost:8080/api/qa/gen" \
  -H "Content-Type: application/json" \
  -d '{"question":"Dieu kien ket hon la gi?","effectiveAt":"2019-01-01","k":8}'

# Admin (cần API key)
curl -X POST "http://localhost:8080/api/admin/reindex" \
  -H "X-API-KEY: your-admin-key"
```

### 4) Postman

- Import collection: `postman/Law Service.postman_collection.json`.
- Thiết lập biến `baseUrl` (mặc định: `http://localhost:8080`).
- Thử các request: Laws, Nodes, QA, và endpoint mới `Suggest Laws`.
