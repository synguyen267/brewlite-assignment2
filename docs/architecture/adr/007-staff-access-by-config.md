# ADR-007: Phân quyền nhân viên bằng cấu hình

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
FR-13 (mức Should) cho nhân viên quầy cập nhật trạng thái đơn. Bảng `User` hiện không có vai trò. Thêm cột vai trò cần migration, cách tạo tài khoản nhân viên và đưa vai trò vào JWT; trong phạm vi MVP chỉ cần phân biệt "nhân viên" với "khách".

## Quyết định
- Nhân viên được khai báo bằng biến môi trường `STAFF_EMAILS` (danh sách email cách nhau bằng dấu phẩy). Tài khoản vẫn đăng ký và đăng nhập như khách.
- `StaffGuard` chạy sau `AuthGuard`, so khớp email trong JWT với danh sách (không phân biệt hoa thường); không khớp thì trả 403.
- Các API dành cho nhân viên nằm dưới `/staff/orders`: `GET` (hàng đợi đơn đã thanh toán chưa giao) và `PATCH /:id/status`.
- Trạng thái chỉ chuyển tiến theo thứ tự: PAID, PREPARING, READY, COMPLETED. Nhảy bước hoặc đơn chưa thanh toán bị từ chối (409). Cập nhật có điều kiện để hai nhân viên bấm cùng lúc không ghi đè nhau.

## Hệ quả
- (+) Không cần migration, đổi danh sách nhân viên chỉ cần đổi biến môi trường trên Render.
- (+) Guard nhỏ, dễ kiểm thử.
- (–) Không có mô hình vai trò thật: không quản lý nhân viên qua giao diện, đổi danh sách cần khởi động lại dịch vụ.
- (–) Chưa có chức năng hủy đơn và hoàn kho.
- Hướng nâng cấp: thêm cột `role` vào `User`, đưa vai trò vào JWT và thay `StaffGuard` bằng guard theo vai trò mà không đổi các endpoint.
