# BrewLite v1.0.0

Bản bàn giao Assignment 2 – Công nghệ Phần mềm (Trường Đại học Sài Gòn).

## Production
- Web: https://brewlite-web-latest.onrender.com
- API: https://brewlite-api-latest.onrender.com
- Health check: https://brewlite-api-latest.onrender.com/health
- Lưu ý gói miễn phí của Render: web tắt sau 15 phút không truy cập (lần truy cập đầu chậm khoảng 50 giây); database miễn phí hết hạn sau 30 ngày.

## Tính năng
- Xem menu 12 sản phẩm, chi tiết sản phẩm, chọn size và topping.
- Giỏ hàng và tính tổng tiền.
- Đăng ký, đăng nhập bằng JWT.
- Tạo đơn: giá tính ở server, trừ tồn kho trong transaction, hết hàng trả 409.
- Thanh toán Ví/Thẻ mô phỏng, có idempotency (gửi lại cùng khóa không tính tiền hai lần).
- Xem chi tiết, trạng thái và lịch sử đơn; trang đơn tự làm mới mỗi 5 giây.
- Nhân viên: trang `/staff` xem hàng đợi đơn (Đơn mới, Đang pha chế, Sẵn sàng nhận) và chuyển trạng thái theo thứ tự; API tương ứng `/staff/orders`. Tài khoản nhân viên khai báo bằng biến môi trường `STAFF_EMAILS`.
- `GET /health` kiểm tra API và database, trả phiên bản (commit SHA).

## Hạ tầng
- Docker Compose chạy web, api, database ở local.
- CI: lint, unit test, build, integration và e2e cho mỗi pull request.
- CD: build image, push lên GHCR (tag theo commit SHA), deploy lên Render, smoke test, rollback về bản `stable` khi lỗi.

## Chưa hiện thực
- FR-08 Mã khuyến mãi (Should), FR-14 Tích điểm (Could).
- Hủy đơn kèm hoàn kho.

## Giới hạn đã biết
- Thanh toán là mô phỏng, không có tích hợp cổng thật (ADR-005, ADR-008).
- Bảng giá lặp ở web và API, cần giữ đồng bộ.
