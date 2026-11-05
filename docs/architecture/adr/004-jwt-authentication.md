# ADR-004: Xác thực bằng JWT, mật khẩu băm bằng bcrypt

- **Trạng thái:** Accepted
- **Ngày:** 2026-11

## Bối cảnh
Đề yêu cầu đăng ký, đăng nhập và JWT (FR-05, FR-06, NFR-02). Frontend và API chạy ở hai origin khác nhau.

## Quyết định
- `POST /auth/login` trả `accessToken` (JWT, claim `sub`, `email`); `AuthGuard` kiểm tra header `Authorization: Bearer`.
- Mật khẩu băm bằng bcryptjs (cost 10); API không trả `passwordHash`.
- `JWT_SECRET` lấy từ biến môi trường, đặt qua secret của nền tảng deploy.

## Hệ quả
- (+) API stateless, dễ chạy nhiều instance.
- (–) Chưa có refresh token và chưa thu hồi token trước hạn; dùng thời hạn ngắn.
- (–) Token lưu ở client (xem rủi ro XSS); chấp nhận cho MVP.
- (–) Giá trị `JWT_SECRET` mẫu trong `.env.example` phải được thay ở production, và API nên từ chối khởi động nếu thiếu secret.
