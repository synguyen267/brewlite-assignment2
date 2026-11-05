# ADR-005: Thanh toán mô phỏng và idempotency key

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Đề cho phép thanh toán Ví/Thẻ mô phỏng. FR-16 (cổng thật) là Won't. Client có thể gửi lại yêu cầu thanh toán khi mất mạng (FR-10).

## Quyết định
- Cổng thanh toán là `MockGatewayService`, nằm sau một phương thức `charge()` để sau này thay bằng cổng thật mà không đổi Service.
- Client gửi `idempotencyKey` cho mỗi lần thanh toán. Cột `Payment.idempotencyKey` là **unique**. Nếu khóa đã tồn tại, API trả lại kết quả của lần đầu và **không** gọi cổng lần nữa.
- Tạo Payment và cập nhật trạng thái Order nằm trong một transaction.

## Hệ quả
- (+) Test được cả nhánh thành công và thất bại bằng `simulateFailure`.
- (+) Gửi lại không tạo thêm giao dịch.
- (–) Cờ `simulateFailure` chỉ phục vụ kiểm thử, phải vô hiệu ở production.
- (–) Hai yêu cầu cùng khóa đến đồng thời phải được chặn bằng ràng buộc unique và xử lý lỗi trùng khóa.
- Hiện trạng: cột đã có trong schema nhưng DTO và Service chưa dùng **[Sprint 2]**.
