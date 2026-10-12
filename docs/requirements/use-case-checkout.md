# Đặc tả use-case UC-04: Đặt và thanh toán đơn hàng

Sơ đồ: `docs/diagrams/usecase-checkout.puml` (ảnh: `docs/diagrams/usecase-checkout.svg`)

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| Mã / Tên | UC-04 – Đặt và thanh toán đơn hàng |
| Mục tiêu | Khách chuyển giỏ hàng thành một đơn hàng đã thanh toán |
| Actor chính | Customer |
| Actor phụ | Payment Service (dịch vụ thanh toán mô phỏng) |
| Trigger | Khách bấm "Đặt đơn" trên trang giỏ hàng |
| Yêu cầu liên quan | FR-04, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11; NFR-02, NFR-03, NFR-06 |

## 2. Tiền điều kiện
1. Giỏ hàng có ít nhất một món với size, topping và số lượng hợp lệ.
2. Khách đã đăng nhập và có JWT còn hiệu lực.
3. Dịch vụ API và cơ sở dữ liệu đang hoạt động.

## 3. Hậu điều kiện

| Kết quả | Trạng thái hệ thống |
|---|---|
| Thành công | Đơn ở trạng thái PAID; có bản ghi `Payment` SUCCESS; tồn kho đã giảm; giỏ hàng được làm trống; khách thấy màn hình xác nhận |
| Thanh toán thất bại | Đơn ở trạng thái PAYMENT_FAILED; có bản ghi `Payment` FAILED; khách được phép thử thanh toán lại |
| Không tạo được đơn | Không có đơn mới; tồn kho không đổi; khách thấy thông báo lỗi |

## 4. Luồng chính (thanh toán thành công)

1. Khách bấm "Đặt đơn" ở trang giỏ hàng.
2. Frontend gửi `POST /orders` kèm JWT, danh sách món và (nếu có) mã khuyến mãi.
3. API xác thực JWT và kiểm tra dữ liệu đầu vào.
4. API mở một transaction: kiểm tra tồn kho từng sản phẩm, trừ tồn kho (có kiểm tra `version`), tính giá và giảm giá ở phía server, tạo `Order` (PENDING) cùng các `OrderItem`.
5. API trả về đơn vừa tạo với tổng tiền cuối cùng.
6. Frontend hiển thị tổng tiền và cho khách chọn phương thức thanh toán (Ví hoặc Thẻ).
7. Khách xác nhận thanh toán; frontend sinh `idempotencyKey` và gửi `POST /payments`.
8. API gọi Payment Service; Payment Service trả kết quả thành công.
9. API ghi `Payment` SUCCESS và đổi đơn sang PAID.
10. Frontend hiển thị xác nhận đơn và trạng thái hiện tại; khách có thể xem lại qua `GET /orders/:id`.

## 5. Luồng thay thế

| Mã | Điều kiện | Xử lý |
|---|---|---|
| A1 | Khách nhập mã khuyến mãi ở bước 2 và mã hợp lệ | API áp dụng giảm giá, ghi `discount` và `promoCode` vào đơn; tiếp tục bước 5 |
| A2 | Khách chọn phương thức Ví hoặc Thẻ ở bước 6 | Hệ thống ghi phương thức tương ứng vào `Payment.method`; luồng tiếp tục như nhau |
| A3 | Khách bấm gửi lại thanh toán (mạng chậm, bấm hai lần) ở bước 7 | API nhận ra `idempotencyKey` đã tồn tại và trả lại kết quả cũ, không tạo giao dịch mới |

## 6. Luồng ngoại lệ

| Mã | Điều kiện | Xử lý |
|---|---|---|
| E1 | JWT thiếu, sai hoặc hết hạn (bước 3) | API trả 401; frontend chuyển khách đến trang đăng nhập; giỏ hàng được giữ nguyên |
| E2 | Dữ liệu đầu vào không hợp lệ (số lượng bằng 0, size lạ...) | API trả 400 kèm thông báo; không tạo đơn |
| E3 | Một sản phẩm hết hàng hoặc không đủ số lượng (bước 4) | Transaction bị hủy, không tạo đơn, tồn kho không đổi; frontend báo món nào hết hàng |
| E4 | Hai khách đặt đồng thời món cuối cùng (xung đột `version`) | Chỉ một transaction thành công; transaction còn lại báo hết hàng |
| E5 | Mã khuyến mãi không hợp lệ (bước 2) | API trả lỗi rõ ràng; khách sửa mã hoặc đặt không dùng mã |
| E6 | Payment Service từ chối hoặc lỗi (bước 8) | API ghi `Payment` FAILED và đổi đơn sang PAYMENT_FAILED; frontend báo thất bại và cho thử lại |
| E7 | Mất kết nối sau khi tạo đơn nhưng trước khi thanh toán | Đơn giữ ở PENDING; khách vào lịch sử đơn để thanh toán lại |

## 7. Quy tắc nghiệp vụ
- Giá và tổng tiền luôn được tính lại ở server; bỏ qua giá do client gửi.
- Một `idempotencyKey` chỉ tương ứng một giao dịch thanh toán.
- Tổng tiền đơn bằng tổng `lineTotal` trừ `discount`.
- Đơn chỉ được thanh toán khi ở trạng thái PENDING hoặc PAYMENT_FAILED.

## 8. Tiêu chí nghiệm thu (để viết test)

| Mã | Kịch bản | Kết quả mong đợi |
|---|---|---|
| AC-01 | Đặt đơn hợp lệ có đăng nhập | 201, đơn PENDING, tồn kho giảm đúng |
| AC-02 | Đặt đơn không có JWT | 401, không có đơn mới |
| AC-03 | Đặt số lượng vượt tồn kho | Lỗi, không có đơn mới, tồn kho giữ nguyên |
| AC-04 | Thanh toán thành công | Đơn PAID, một `Payment` SUCCESS |
| AC-05 | Thanh toán bị từ chối | Đơn PAYMENT_FAILED, một `Payment` FAILED |
| AC-06 | Gửi hai lần cùng `idempotencyKey` | Chỉ một `Payment`, hai phản hồi giống nhau |
| AC-07 | Mã khuyến mãi hợp lệ | `discount` > 0 và `total` giảm đúng |
| AC-08 | Hai yêu cầu đồng thời cho món cuối cùng | Đúng một yêu cầu thành công |
