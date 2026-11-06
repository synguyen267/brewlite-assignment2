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
│   └── api/                # NestJS, cổng 3001 (prisma/ chứa schema, migration, seed)
├── docs/
│   ├── requirements/       # Task 1: bối cảnh, SRS, use-case
│   ├── diagrams/           # Task 2: activity, sequence, class
│   ├── architecture/       # Task 3: kiến trúc, ADR, deployment diagram
│   └── backlog.md          # Product Backlog Sprint 1, Sprint 2
├── tests/                  # Integration/E2E (bổ sung ở Sprint 2)
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

- `apps/api/.env`: các biến của backend (`PORT`, `DATABASE_URL`, `JWT_SECRET`)
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

> **[Sprint 2]** Chạy toàn bộ hệ thống (web, api, db) bằng một lệnh `docker compose up` và endpoint `GET /health` sẽ được bổ sung.

## Kiểm thử, lint, build

Chạy trong từng thư mục `apps/api` và `apps/web`:

| Việc | Lệnh |
|---|---|
| Lint | `npm run lint` |
| Unit test (API) | `npm test` |
| E2E test (API) | `npm run test:e2e` |
| Build | `npm run build` |

CI chạy chuỗi Install → Lint → Test → Build cho mỗi pull request. Pull request không được merge khi một bước thất bại.

## Tài liệu

- Yêu cầu: `docs/requirements/`
- Sơ đồ: `docs/diagrams/`
- Kiến trúc và quyết định kiến trúc: `docs/architecture/` (ADR trong `docs/architecture/adr/`)
- Backlog: `docs/backlog.md`
- Quy ước làm việc: `CONTRIBUTING.md`

## Triển khai và rollback

**[Sprint 2]** Hướng dẫn triển khai lên Render và rollback sẽ nằm ở `docs/deployment.md`.
