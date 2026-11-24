# ADR-008: Thứ tự gọi cổng thanh toán và ghi cơ sở dữ liệu

- Trạng thái: Đã chấp nhận (hạn chế đã biết)
- Liên quan: FR-09, FR-10, ADR-005, sequence-checkout

## Bối cảnh
Luồng thanh toán hiện gọi cổng thanh toán trước, sau đó ghi `Payment` và cập nhật trạng thái đơn trong một `$transaction`. Nếu việc ghi thất bại sau khi cổng đã tính tiền thì hệ thống mất dấu giao dịch.

## Các phương án
1. Giữ nguyên: gọi cổng rồi ghi DB trong transaction.
2. Ghi trước một bản `Payment` ở trạng thái chờ (PENDING), gọi cổng, rồi cập nhật kết quả.
3. Giữ nguyên và đối soát định kỳ với cổng thanh toán.

## Quyết định
Chọn phương án 1 cho MVP.
- Cổng thanh toán là dịch vụ mô phỏng trong tiến trình API (`MockGatewayService`), không tính tiền thật nên rủi ro mất dấu giao dịch không gây thiệt hại thực.
- `idempotencyKey` duy nhất trên `Payment` bảo đảm client gửi lại không tạo giao dịch thứ hai khi giao dịch đầu đã ghi thành công.

## Hệ quả
- Hạn chế: nếu tích hợp cổng thật, phương án này không đủ. Cần chuyển sang phương án 2 (thêm trạng thái PENDING cho `PaymentStatus`) hoặc phương án 3.
- Ranh giới `MockGatewayService` giúp thay cổng thật sau này mà ít sửa luồng nghiệp vụ.
