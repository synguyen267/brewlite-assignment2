# Kịch bản quay video demo (3 đến 5 phút)

Quay màn hình điện thoại hoặc trình duyệt ở chế độ mobile (khung 360 đến 400 px). Đánh thức web và API trước khi quay (mở URL production khoảng 1 phút trước).

| Mốc | Nội dung | Cần thấy |
|---|---|---|
| 0:00 | Giới thiệu: BrewLite, công nghệ Next.js, NestJS, PostgreSQL, Docker, Render | Trang menu production, thanh địa chỉ HTTPS |
| 0:30 | Xem menu 12 sản phẩm, mở chi tiết, chọn size và topping | Giá đổi theo lựa chọn |
| 1:00 | Thêm vào giỏ, sửa số lượng | Tổng tiền cập nhật |
| 1:20 | Chưa đăng nhập bấm đặt đơn, chuyển đến đăng nhập; đăng ký rồi đăng nhập | Giỏ hàng được giữ |
| 1:50 | Đặt đơn, thanh toán Ví | Đơn chuyển PAID, màn hình xác nhận |
| 2:20 | Thanh toán thất bại (chế độ demo), thử lại thành công | PAYMENT_FAILED rồi PAID |
| 2:50 | Mở tab thứ hai, đăng nhập tài khoản nhân viên (email trong `STAFF_EMAILS`), vào `/staff`, bấm lần lượt "Bắt đầu pha chế", "Đã pha xong", "Đã giao khách"; trang đơn của khách tự cập nhật | PREPARING, READY, COMPLETED |
| 3:30 | Mở `/health` | `status: ok`, `db: up`, `version` = commit SHA |
| 3:50 | GitHub Actions: lần CD thành công, và lần thất bại (smoke test dừng pipeline) | Các job xanh/đỏ |
| 4:20 | Kết luận: những gì chưa làm (FR-08, FR-14) | |

Sau khi quay: tải lên YouTube (Unlisted) hoặc Google Drive (bật quyền xem), dán link vào README, báo cáo (mục 5.4) và release notes.
