# Deployment diagram (production) – ghi chú

Sơ đồ: `docs/architecture/deployment-production.puml` (ảnh: `docs/architecture/deployment-production.svg`).
Nền tảng: **Render** (ADR-006). Sơ đồ mô tả kiến trúc đích; chỗ nào chưa có trong repo được đánh dấu **[Sprint 2]**. Khi tạo service thật trên Render, nếu tên service, cổng hoặc biến môi trường khác thì phải sửa sơ đồ này cho khớp.

## 1. Ranh giới local, CI, production

| Vùng | Chạy ở đâu | Chạy gì | Cấu hình và secret |
|---|---|---|---|
| Local | Máy lập trình viên, Docker Compose | web, api, db | File `.env` (không commit); mẫu ở `.env.example` |
| CI | GitHub Actions, GHCR | lint, test, build, build image, push image, gọi deploy hook, smoke test | GitHub Secrets (deploy hook); GHCR dùng `GITHUB_TOKEN` |
| Production | Render | brewlite-web, brewlite-api, Render Postgres | Biến môi trường trên Render |

Hai đường đi qua ranh giới: code đi từ local lên CI bằng `git push` và pull request; image đi từ CI lên production qua GHCR và deploy hook. Không có đường nào mà secret production nằm trong repo hay log CI (NFR-04).

## 2. Truy vết container → kiến trúc → mã nguồn

| Thành phần trong sơ đồ | Thành phần kiến trúc (`architecture.md`) | Mã nguồn / tạo phẩm |
|---|---|---|
| Trình duyệt / PWA | Mục 3, container Web | `apps/web` (manifest PWA **[Sprint 2]**) |
| brewlite-web | Mục 3, container Web | `apps/web`, `apps/web/Dockerfile` **[Sprint 2]** |
| brewlite-api | Mục 3 và 4, container API | `apps/api`, `apps/api/Dockerfile` **[Sprint 2]** |
| Health check `GET /health` | Mục 7, HealthModule | `apps/api/src/health` **[Sprint 2]** |
| Render Postgres | Mục 5, container Database | `apps/api/prisma` (schema, migration, seed) |
| Pre-deploy `prisma migrate deploy` | Mục 5, ADR-003 và ADR-006 | `apps/api/prisma/migrations` |
| GitHub Actions | ADR-006 | `.github/workflows/ci.yml`, `deploy.yml` **[Sprint 2]** |
| GHCR | ADR-006 | image `ghcr.io/<owner>/brewlite-api`, `brewlite-web`, tag là commit SHA |
| Docker Compose (local) | Mục 3 | `docker-compose.yml` (hiện mới có db; thêm web, api **[Sprint 2]**) |
| Render logs | Mục 7, Logging | stdout của NestJS và Next.js |

## 3. Giao thức và cổng

| Kết nối | Giao thức | Cổng | Ghi chú |
|---|---|---|---|
| Trình duyệt → brewlite-web | HTTPS | 443 | Render cấp chứng chỉ TLS |
| Trình duyệt → brewlite-api | HTTPS, JSON, header `Authorization: Bearer` | 443 | CORS chỉ cho phép origin của web |
| brewlite-api → Render Postgres | TCP (PostgreSQL) | 5432 | URL nội bộ; database không mở public |
| Runner → GHCR | HTTPS | 443 | `docker push` |
| Runner → Render | HTTPS | 443 | `POST` vào deploy hook |
| Render → GHCR | HTTPS | 443 | Kéo image; nếu image private thì lưu thông tin đăng nhập registry trên Render |
| Runner → brewlite-api | HTTPS | 443 | Smoke test `GET /health`, `GET /products` |
| Local: web → api → db | HTTP, TCP | 3000, 3001, 5432 (host 5433) | Chỉ trong Docker Compose |

Trong container, service lắng nghe cổng do biến `PORT` quy định; API đã đọc `process.env.PORT`.

## 4. Secret, health check, log

| Chủ đề | Thiết kế |
|---|---|
| Secret | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` đặt trong biến môi trường của Render; deploy hook đặt trong GitHub Secrets. Repo chỉ có `.env.example` với giá trị mẫu. Không in secret ra log CI |
| Health check | Render gọi `GET /health` của API; chỉ chuyển traffic sang bản mới khi trả 200. CI gọi lại sau deploy như smoke test |
| Log | Service ghi ra stdout, xem ở Render logs. Không log mật khẩu, token, `DATABASE_URL` |
| Migration | Chạy `prisma migrate deploy` ở bước pre-deploy của API, trước khi bản mới nhận traffic; migration lỗi thì deploy dừng |
| Rollback | Deploy lại image có commit SHA của lần chạy tốt trước đó (hoặc dùng rollback của Render); hướng dẫn chi tiết ở `docs/deployment.md` **[Sprint 2]** |

## 5. Giới hạn đã biết

- Next.js được triển khai như Web Service chạy Docker, không dùng CDN riêng; Render cấp TLS ở lớp ngoài. Nếu sau này thêm CDN, phải cập nhật sơ đồ.
- Gói miễn phí của Render có thể tạm dừng service khi không có traffic và có giới hạn với database. Cần kiểm tra điều kiện gói hiện tại và bảo đảm URL hoạt động vào lúc chấm.
- Migration không tự rollback. Mỗi migration phải tương thích với bản code đang chạy trước đó.

## 6. Cách kết xuất SVG

```
java -jar plantuml.jar -tsvg docs/architecture/deployment-production.puml
```

Hoặc dùng tiện ích PlantUML của VS Code (Export Current Diagram, định dạng SVG). Commit cả `.puml` và `.svg`.
