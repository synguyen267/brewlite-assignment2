# BrewLite

Ứng dụng web mobile-first để đặt đồ uống, thanh toán không dùng tiền mặt (mô phỏng) và theo dõi đơn. Bài tập lớn môn Công nghệ phần mềm (Assignment 2 – Requirements to Deployment), Trường Đại học Sài Gòn.

Luồng nghiệp vụ: Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (TypeScript, Tailwind CSS), mobile-first/PWA |
| Backend | NestJS (TypeScript), Prisma |
| Cơ sở dữ liệu | PostgreSQL 16 |
| Đóng gói, CI/CD | Docker, Docker Compose, GitHub Actions |

## Cấu trúc repository

```
brewlite/
├── apps/
│   ├── web/                # Next.js, cổng 3000
│   └── api/                # NestJS, cổng 3001 (prisma/: schema, migration, seed; test/: integration và e2e)
├── docs/
│   ├── requirements/       # Task 1: bối cảnh, SRS, use-case
│   ├── diagrams/           # Task 2: activity, sequence, class
│   ├── architecture/       # Task 3: kiến trúc, ADR, deployment diagram
│   ├── traceability-matrix.md  # Ma trận truy vết
│   ├── deployment.md       # Triển khai, rollback
│   ├── release-notes-v1.0.0.md
│   ├── demo-video.md       # Kịch bản video demo
│   └── backlog.md          # Product Backlog Sprint 1, Sprint 2
├── .github/                # Mẫu pull request, workflow CI/CD
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md         # Branch, commit, pull request, Definition of Done
└── README.md
```

## Yêu cầu

- Node.js 24.9 trở lên (LTS 24) và npm; Jest của API cần phiên bản này để chạy test
- Git
- Docker Desktop

## Chạy ở máy local

### 1. Cấu hình biến môi trường

`.env.example` ở thư mục gốc liệt kê toàn bộ biến. Tạo hai tệp từ nó (không commit):

- `apps/api/.env`: các biến của backend (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `STAFF_EMAILS`)
- `apps/web/.env.local`: biến của frontend (`NEXT_PUBLIC_API_URL`)

Đổi `JWT_SECRET` thành một chuỗi bí mật của riêng bạn.

### 2. Chạy cơ sở dữ liệu

```
docker compose up -d
```

PostgreSQL chạy ở cổng **5433** của máy (cổng 5432 bên trong container).

### 3. Migration và dữ liệu mẫu

```
cd apps/api
npm install
npx prisma migrate dev
node --env-file=.env prisma/seed.js
```

### 4. Chạy backend

```
cd apps/api
npm run start:dev
```

Kiểm tra: mở http://localhost:3001/products, thấy danh sách sản phẩm dạng JSON.

### 5. Chạy frontend

```
cd apps/web
npm install
npm run dev
```

Mở http://localhost:3000 để xem menu.

Kiểm tra sức khỏe dịch vụ: `GET http://localhost:3001/health` trả `{"status":"ok","db":"up",...}`; trả 503 khi database lỗi.

### Chạy toàn bộ bằng Docker

```
docker compose --profile app up --build
```

Lệnh này build và chạy cả ba dịch vụ: database (cổng 5433), API (http://localhost:3001) và web (http://localhost:3000). API tự áp dụng migration và nạp dữ liệu mẫu khi bảng sản phẩm còn trống. Dừng và xóa container: `docker compose --profile app down` (thêm `-v` để xóa luôn dữ liệu database).

Biến môi trường của API khi chạy bằng Docker: `JWT_SECRET`, `STAFF_EMAILS`, `CORS_ORIGIN`, `RUN_SEED`. Biến `NEXT_PUBLIC_*` của web được ghi cứng lúc build nên truyền qua `build.args` (xem `docker-compose.yml`).

## Kiểm thử, lint, build

Chạy trong từng thư mục `apps/api` và `apps/web`:

| Việc | Lệnh |
|---|---|
| Lint | `npm run lint` |
| Unit test (API) | `npm test` |
| Integration và E2E test (API, cần database đang chạy và đã migrate) | `npm run test:e2e` |
| Build | `npm run build` |

CI chạy chuỗi Install → Lint → Test → Build cho mỗi pull request. Pull request không được merge khi một bước thất bại.

## Tài liệu

- Yêu cầu: `docs/requirements/`
- Sơ đồ: `docs/diagrams/`
- Kiến trúc và quyết định kiến trúc: `docs/architecture/` (ADR trong `docs/architecture/adr/`)
- Backlog: `docs/backlog.md`
- Quy ước làm việc: `CONTRIBUTING.md`

## Triển khai và rollback

Production chạy trên Render (Web Service chạy image Docker lấy từ GitHub Container Registry), database là Render PostgreSQL, không mở public.

| Thành phần | Địa chỉ |
|---|---|
| Frontend | https://brewlite-web-latest.onrender.com |
| API | https://brewlite-api-latest.onrender.com |
| Health check | https://brewlite-api-latest.onrender.com/health |

Gói miễn phí của Render tắt dịch vụ sau 15 phút không truy cập, lần truy cập đầu có thể mất khoảng 50 giây.

### Triển khai (CD)

Pipeline `.github/workflows` chạy khi push hoặc gắn tag: Lint và Test → Build → Build Docker image (tag theo commit SHA) → Push lên GHCR → Deploy (gọi deploy hook của Render, migration chạy ở bước pre-deploy) → Smoke test (`GET /health`, `GET /products`). Secret (deploy hook) nằm trong GitHub Secrets, không có trong repository hay log.

### Rollback

- Tự động: nếu deploy hoặc smoke test lỗi, pipeline dừng và gọi lại deploy hook với image tag `stable` (bản đã qua smoke test gần nhất).
- Thủ công: gọi deploy hook với `imgURL` trỏ tới tag SHA của một commit trước đó, hoặc dùng chức năng Rollback trong bảng điều khiển Render.

Chi tiết từng bước: `docs/deployment.md`. Ghi chú phát hành: `docs/release-notes-v1.0.0.md`.
