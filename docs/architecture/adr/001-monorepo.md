# ADR-001: Dùng monorepo

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Hệ thống có web, API và tài liệu. Đề yêu cầu cấu trúc `apps/web`, `apps/api`, `docs` và mọi thay đổi tài liệu đi qua pull request.

## Quyết định
Một repository chứa `apps/web`, `apps/api`, `docs`, `tests`, `.github/workflows`. Mỗi app có `package.json` và lockfile riêng, chưa dùng công cụ workspace.

## Hệ quả
- (+) Một PR đổi được code, test, sơ đồ và ma trận truy vết cùng lúc.
- (+) CI và docker-compose đặt ở gốc, dễ chạy toàn hệ thống.
- (–) CI chạy cho cả hai app; dùng bộ lọc `paths` nếu quá chậm.
- (–) Không chia sẻ code giữa web và API (ví dụ `pricing.ts` đang có hai bản), phải kiểm thử để chúng không lệch nhau.

## Phương án đã loại
Hai repo riêng (web, api): tách bạch nhưng khó truy vết và khó giữ tài liệu thống nhất.
