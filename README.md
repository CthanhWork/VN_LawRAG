# VN Law RAG Starter

Demo hệ thống RAG luật Việt Nam chạy bằng Docker Compose với các thành phần: MySQL, Redis, ChromaDB, `rag-service` (Python/Flask), `law-service` và `social-service` (Spring Boot), cùng giao diện React (`Lawer_UI`).

## Yêu cầu
- Docker Desktop + Docker Compose.
- Node.js >= 18 để chạy `Lawer_UI`; (tùy chọn) JDK 17 + Maven nếu muốn build thủ công.
- Các cổng mặc định: 3307 (MySQL), 6379 (Redis), 8008 (Chroma - optional), 5001 (`rag-service`), 8080 (`law-service`), 8082 (`social-service`), 5173 (Vite).

## Thiết lập cấu hình (.env)
1. Sao chép file mẫu và điền giá trị riêng:
   ```powershell
   cp .env.example .env
   ```
2. Bắt buộc điền: `GEMINI_API_KEY`, các biến `MAIL_*` và `CLOUDINARY_*`. Giữ nguyên giá trị DB/Redis mặc định nếu chạy bằng docker compose.
3. Nếu đổi host/port UI, cập nhật `CORS_ALLOW_ORIGINS` cho phép nguồn đó.
4. Đặt các file PDF luật ở thư mục gốc repo (cùng cấp `docker-compose.yml`) trước khi chạy để job `seed-pdfs` import vào MySQL và embed vào Chroma.
5. `.env` và `docs/` đã nằm trong `.gitignore` – không commit các file này lên repo.

## Chạy nhanh backend (Docker Compose)
```powershell
docker compose up --build -d
```
- Tự khởi động MySQL, Redis, Chroma, `rag-service` (http://localhost:5001), `law-service` (http://localhost:8080), `social-service` (http://localhost:8082) và job `seed-pdfs` một lần để import + embed.
- Kiểm tra log seed:
  ```powershell
  docker compose logs seed-pdfs
  ```
- Rebuild index khi thay PDF:
  ```powershell
  docker compose exec rag-service bash -lc "python tools/embed_laws_plus.py --rebuild"
  ```
- Healthcheck nhanh:
  ```powershell
  Invoke-RestMethod "http://localhost:5001/ready"
  Invoke-RestMethod "http://localhost:8080/actuator/health/readiness"
  ```

## Giao diện `Lawer_UI`
```powershell
cd Lawer_UI
npm install
npm run dev
```
- Mặc định UI gọi `http://localhost:8080` và `http://localhost:5001`; đổi `Lawer_UI/.env.local` nếu backend chạy host/port khác.
- Vite dev server: http://localhost:5173.

## Thử API nhanh
```powershell
$body = @{ question = "Điều kiện kết hôn là gì?" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/qa" -Method Post -ContentType "application/json" -Body $body
```
Hoặc gọi trực tiếp `rag-service /analyze` với file JSON mẫu `analyze_body.json`:
```powershell
curl.exe -X POST "http://localhost:5001/analyze" ^
  -H "Content-Type: application/json; charset=utf-8" ^
  --data-binary "@analyze_body.json"
```

## Lưu ý bảo mật
- Các khóa/API secret đã được loại khỏi repo; hãy thay ngay các giá trị GEMINI/SMTP/Cloudinary đã từng commit trước đó.
- Không check-in `.env`, dữ liệu PDF hoặc thư mục `docs/`.
