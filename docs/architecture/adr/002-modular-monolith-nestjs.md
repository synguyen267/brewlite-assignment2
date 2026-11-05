# ADR-002: Modular monolith với NestJS phân lớp

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Nghiệp vụ gồm sản phẩm, xác thực, đơn hàng, thanh toán. Đơn hàng, thanh toán và tồn kho cần nhất quán dữ liệu. Nhóm nhỏ, thời gian ngắn.

## Quyết định
Một ứng dụng NestJS, chia module theo domain (`products`, `auth`, `orders`, `payments`, `prisma`, `health`). Mỗi module có Controller (HTTP, DTO, guard), Service (nghiệp vụ) và truy cập dữ liệu qua `PrismaService`.

## Hệ quả
- (+) Một đơn vị deploy; transaction giữa Order, Payment, tồn kho nằm trong một database.
- (+) Controller và Service tách bạch nên unit test Service bằng mock Prisma được.
- (–) Không scale độc lập từng module; chấp nhận với quy mô MVP.
- (–) Cần kỷ luật để module không gọi chéo lung tung; quy tắc: module chỉ phụ thuộc module khác qua Service được export.

## Phương án đã loại
Microservices: chi phí vận hành, transaction phân tán và triển khai nhiều service vượt quá nhu cầu.
