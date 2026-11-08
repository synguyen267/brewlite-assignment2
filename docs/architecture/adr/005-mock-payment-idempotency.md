# ADR-005: Thanh toán mô phỏng và idempotency key

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Đề cho phép thanh toán Ví/Thẻ mô phỏng. FR-16 (cổng thật) là Won't. Client có thể gửi lại yêu cầu thanh toán khi mất mạng (FR-10).

## Quyết định
- Cổng thanh toán là `MockGatewayService`, nằm sau một phương thức `charge()` để sau này thay bằng cổng thật mà không đổi Service.
- Client gửi `idempotencyKey` (chuỗi 8 đến 64 ký tự, bắt buộc) cho mỗi lần thanh toán. Cột `Payment.idempotencyKey` là **unique**. Nếu khóa đã tồn tại, API trả lại kết quả của lần đầu (kèm `replayed: true`) và **không** gọi cổng lần nữa. Muốn thử thanh toán lại sau khi thất bại thì client dùng khóa mới.
- Khóa đã dùng cho đơn của người dùng khác bị từ chối (409).
- Tạo Payment và cập nhật trạng thái Order nằm trong một transaction.

## Hệ quả
- (+) Test được cả nhánh thành công và thất bại bằng `simulateFailure`.
- (+) Gửi lại không tạo thêm giao dịch.
- (–) Cờ `simulateFailure` chỉ phục vụ kiểm thử, phải vô hiệu ở production.
- (–) Hai yêu cầu cùng khóa đến đồng thời được chặn bằng ràng buộc unique và xử lý lỗi trùng khóa, nhưng cả hai có thể cùng gọi cổng trước khi ràng buộc unique chặn yêu cầu thua; bản mô phỏng không bị ảnh hưởng, còn với cổng thật thì khóa được truyền xuống cổng (`MockGatewayService.charge` đã nhận `idempotencyKey`) để cổng tự chống trừ tiền hai lần.
- Hiện trạng: đã hiện thực trong `PaymentsService` và có unit test.
