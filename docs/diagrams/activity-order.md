# Activity diagram luồng đặt đơn – ghi chú

Sơ đồ: `docs/diagrams/activity-order.puml` (ảnh: `docs/diagrams/activity-order.svg`)

## Đối chiếu với yêu cầu của đề (Task 2.1)

| Yêu cầu của đề | Thể hiện trong sơ đồ |
|---|---|
| Điểm bắt đầu và kết thúc | Một điểm bắt đầu ở làn Khách hàng. Ba điểm kết thúc: hết hàng, đơn hoàn tất (COMPLETED), thanh toán thất bại và khách không thử lại (PAYMENT_FAILED) |
| Hành động của người dùng và hệ thống | Các làn Khách hàng và Hệ thống BrewLite |
| Decision/merge cho nhánh thành công và thất bại | Năm điểm quyết định: còn thêm món khác, đã đăng nhập, còn đủ tồn kho, thanh toán thành công, khách có thử lại. Có hai điểm hợp nhánh: sau bước đăng nhập và sau vòng lặp chọn món |
| Swimlane khi nhiều actor | Bốn làn: Khách hàng, Hệ thống BrewLite, Dịch vụ thanh toán, Nhân viên quầy |
| Trường hợp hết hàng | Nhánh "hết hàng": hủy giao dịch, không tạo đơn, báo cho khách, kết thúc luồng (khách mở lại giỏ hàng và đặt lại là một luồng mới) |
| Trường hợp chưa đăng nhập | Nhánh "chưa": khách đăng nhập hoặc đăng ký, hệ thống cấp JWT, rồi hợp nhánh và tiếp tục |
| Trường hợp thanh toán thất bại | Nhánh "thất bại": ghi `Payment` FAILED, đơn PAYMENT_FAILED, báo khách. Khách chọn thử lại thì quay về bước gửi thanh toán, không thử lại thì giữ đơn ở PAYMENT_FAILED |

## Khớp với các sơ đồ khác

- Từ "Kiểm tra dữ liệu" đến "Ghi Payment" trùng với `sequence-checkout`.
- Các trạng thái PENDING, PAID, PAYMENT_FAILED, PREPARING, READY, COMPLETED trùng với `OrderStatus` trong `class-domain`.
- Việc nhân viên đổi PREPARING, READY, COMPLETED ứng với FR-13, hiện là thiết kế Sprint 2 (code chưa có vai trò nhân viên và API đổi trạng thái).
- Trạng thái CANCELLED chưa vẽ vì nằm ngoài luồng chính.

## Truy vết

FR-01 đến FR-04, FR-06, FR-07, FR-09 đến FR-13; use-case UC-01, UC-02, UC-04, UC-05, UC-06, UC-08.
