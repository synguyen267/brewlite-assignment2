# ADR-003: PostgreSQL với Prisma và migration

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
PostgreSQL là bắt buộc. Cần schema có kiểu, migration tái tạo được (NFR-09) và transaction (NFR-06).

## Quyết định
Dùng Prisma (6.x) làm ORM và công cụ migration. Schema ở `apps/api/prisma/schema.prisma`, migration được commit, seed bằng `prisma/seed.js`. Local dùng `prisma migrate dev`; production dùng `prisma migrate deploy`.

## Hệ quả
- (+) Database dựng lại từ đầu bằng migration và seed; lịch sử thay đổi nằm trong git.
- (+) `$transaction` hỗ trợ ghi đơn và trừ tồn kho cùng lúc.
- (–) Migration chạy khi deploy có rủi ro: mỗi migration phải tương thích với bản code cũ đang chạy (thêm cột trước, xóa cột sau), và chạy một lần trước khi bản mới nhận traffic.
- (–) Prisma tạo thêm bước `generate` trong build Docker.
