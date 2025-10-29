# Law Service (Spring Boot)

Minimal Spring Boot service that exposes APIs to read laws and law nodes from MySQL and forward QA requests to the RAG service.

Requirements
- JDK 17
- Maven
- A running MySQL instance with the `laws` database (Flyway migrations will create schema and seed minimal data)

Quick start

1. Build:

   mvn -f services/law-service clean package -DskipTests

2. Run (example overriding DB creds):

   java -jar services/law-service/target/law-service-0.0.1-SNAPSHOT.jar \
     --spring.datasource.url=jdbc:mysql://host.docker.internal:3307/laws \
     --spring.datasource.username=root \
     --spring.datasource.password=Thanhabc123@@

API Highlights
- GET /api/laws
- GET /api/laws/{id}
- GET /api/laws/search?keyword=...
- GET /api/laws/suggest?keyword=...&limit=10
- GET /api/laws/{lawId}/nodes
- GET /api/nodes/{id}
- GET /api/nodes/search?keyword=...
- GET /api/nodes/search/fulltext?q=...  (requires MySQL FULLTEXT index)
- POST /api/qa  (body: {"question":"..."}, query: effectiveAt=YYYY-MM-DD) forwards to rag-service
- POST /api/qa/gen  (body: {"question","effectiveAt","k","maxTokens","temperature"}) uses LLM generation with citations
- POST /api/admin/reindex  (internal) triggers RAG re-embedding
- Actuator: /actuator/health, /actuator/metrics, /actuator/prometheus

Docker
- Dockerfile included under `services/law-service/dockerfile` (uses JRE 17 and profile `docker`).
- In `docker-compose.yml`, the service is defined as `law-service` and exposes `8080:8080`.
- Environment variables:
  - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
  - `RAG_SERVICE_URL` (base URL, e.g. `http://rag-service:5001`)
 - Build the JAR before composing (in repo root):
   - `mvn -f services/law-service clean package -DskipTests`

Smoke test (after `docker compose up --build`):

  curl http://localhost:8080/api/laws
  curl http://localhost:8080/api/laws/1/nodes
  curl -X POST http://localhost:8080/api/qa \
    -H "Content-Type: application/json" \
    -d '{"question":"Điều kiện kết hôn là gì?"}'

Observability
- Prometheus scrape endpoint: `GET /actuator/prometheus` (enabled via micrometer-registry-prometheus)
- Health/metrics: `GET /actuator/health`, `GET /actuator/metrics`
- Logs include `traceId`/`spanId` fields in the pattern (see `logback-spring.xml`). To populate these IDs, integrate Micrometer Tracing (e.g., Brave or OpenTelemetry) in your stack.

Security
- CORS: configured via `cors.allowed-origins` (default: `http://localhost:3000`).
- Rate limiting: simple token bucket filter for `/api/qa` (defaults 60 req/min). Tune via `ratelimit.qa.capacity` and `ratelimit.qa.refill-seconds`.
- Admin API key: protect admin routes (`/api/admin/**`) with `X-API-KEY` header. Set `security.admin.api-key` as an environment variable or property.

Notes
- application.properties uses jdbc to localhost:3307 for convenience in docker-compose setups. Override with CLI args or env vars in production.
- This is a minimal skeleton. Add DTOs, validation, paging, security, and tests as next steps.

Fulltext search (MySQL)
- Ensure you are on MySQL/InnoDB with FULLTEXT support.
- Create index once:

  ALTER TABLE law_nodes ADD FULLTEXT ft_content (content_text);

- Endpoint returns highlighted snippets with the query wrapped in <mark>…</mark>.
- Database migrations
  - Flyway runs on startup (profiles default and docker).
  - Migrations live under `src/main/resources/db/migration`:
    - V1__base.sql: tables
    - V2__indexes.sql: indexes + FULLTEXT
    - V3__seed_hng.sql: sample data
