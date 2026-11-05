# ADR-006: Triển khai bằng Docker lên Render, CI/CD bằng GitHub Actions

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Đề yêu cầu production truy cập được qua HTTPS, database không public trực tiếp, secret ngoài repo, health check, migration an toàn và rollback. Ứng viên theo đề: Render, Railway, Fly.io, Azure, AWS, VPS.

## Quyết định
Dùng **Render**:
- Web (Next.js) và API (NestJS) là hai **Web Service** chạy từ Docker image.
- PostgreSQL là **Render Postgres**, API kết nối bằng URL nội bộ; database không mở truy cập từ Internet.
- Render cấp HTTPS cho hai URL công khai.
- GitHub Actions: lint, test, build, build Docker image gắn tag commit SHA, push lên container registry (GHCR), rồi gọi deploy hook của Render bằng secret của CI.
- Migration `prisma migrate deploy` chạy ở bước pre-deploy của API, trước khi instance mới nhận traffic; nếu migration lỗi thì deploy dừng.
- Health check của Render trỏ vào `GET /health`; sau deploy, CI chạy smoke test vào URL production.
- Rollback: deploy lại image của commit SHA trước đó (hoặc dùng rollback của Render), ghi trong `docs/deployment.md`.

## Hệ quả
- (+) Cùng một Docker image chạy local (docker-compose) và production.
- (+) Cấu hình, secret và health check có sẵn trên nền tảng.
- (–) Phụ thuộc nền tảng; sơ đồ deployment phải phản ánh đúng Render.
- (–) Gói miễn phí có thể tạm dừng service khi không có traffic và có giới hạn với database; cần kiểm tra điều kiện gói hiện tại trước khi nộp, vì đề yêu cầu URL hoạt động lúc chấm.
- (–) Migration không tự rollback; mọi migration phải tương thích ngược một phiên bản.

## Phương án đã loại
VPS tự quản (tốn công cấu hình HTTPS, backup, bảo mật); AWS/Azure (phức tạp, chi phí cao hơn nhu cầu).
