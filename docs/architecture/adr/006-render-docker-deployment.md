# ADR-006: Triển khai bằng Docker lên Render, CI/CD bằng GitHub Actions

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Đề yêu cầu production truy cập được qua HTTPS, database không public trực tiếp, secret ngoài repository, health check, migration an toàn và rollback. Ứng viên theo đề: Render, Railway, Fly.io, Azure, AWS, VPS.

## Quyết định
Dùng **Render**, chạy image dựng sẵn từ GitHub Container Registry (GHCR):
- Web (Next.js) và API (NestJS) là hai **Web Service** kiểu "Existing Image". PostgreSQL là **Render Postgres**, API kết nối bằng URL nội bộ; database không mở truy cập từ Internet. Render cấp HTTPS cho hai URL công khai.
- GitHub Actions (`cd.yml`): quality gate (lint, test, build) -> build image gắn tag **commit SHA** (và tag phiên bản khi đẩy tag `v*`) -> push GHCR -> gọi **deploy hook** của Render với `imgURL` trỏ tới đúng tag vừa build -> smoke test -> đánh dấu image `stable`.
- Migration `prisma migrate deploy` chạy **khi container API khởi động**, trước khi API nhận traffic; migration lỗi thì container không lên và deploy thất bại. Cách này không phụ thuộc tính năng pre-deploy của Render.
- Health check: Render gọi `GET /health`. API báo cả `version` (commit SHA ghi vào image) nên smoke test chỉ đạt khi **đúng bản mới** đang chạy, không nhầm với bản cũ.
- Rollback: khi smoke test lỗi, pipeline gọi lại deploy hook với tag `stable` (bản đã qua smoke test gần nhất), rồi báo thất bại. Rollback thủ công về một commit bằng deploy hook với tag SHA, hoặc bằng Render.
- Secret: deploy hook trong GitHub Secrets; `DATABASE_URL`, `JWT_SECRET` trong biến môi trường của Render.

## Hệ quả
- (+) Cùng một image chạy local (docker compose) và production; tag SHA cho phép truy vết và rollback chính xác.
- (+) Smoke test kiểm tra đúng phiên bản, nên phát hiện được việc deploy không thực sự áp dụng.
- (–) Phụ thuộc nền tảng; sơ đồ deployment phải phản ánh đúng Render.
- (–) Render pull image mỗi lần deploy nên image phải còn trong GHCR; gói miễn phí có thể tạm dừng dịch vụ khi không có traffic.
- (–) Migration không tự rollback; mỗi migration phải tương thích với bản code chạy trước đó.
- (–) Địa chỉ API được ghi cứng vào image web lúc build (biến `NEXT_PUBLIC_*`), nên đổi địa chỉ API cần build lại web.

## Phương án đã loại
- Render build từ mã nguồn (không qua registry): không cho phép gắn tag SHA và rollback chính xác.
- VPS tự quản (tốn công cấu hình HTTPS, backup, bảo mật); AWS/Azure (phức tạp, chi phí cao hơn nhu cầu).
