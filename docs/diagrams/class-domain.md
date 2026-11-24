# Class diagram (domain) – ghi chú

Sơ đồ: `docs/diagrams/class-domain.puml` (ảnh: `docs/diagrams/class-domain.svg`)

## Đối chiếu với schema Prisma

| Lớp | Nguồn | Ghi chú |
|---|---|---|
| User | Có trong schema | Vai trò nhân viên không lưu trong bảng: xác định bằng biến môi trường `STAFF_EMAILS` và `StaffGuard` (ADR-007). `loyaltyPoints` đã có |
| Product | Có trong schema | `stock` kiểm soát tồn kho bằng cập nhật có điều kiện `stock >= qty` (NFR-06); cột `version` có trong schema nhưng code chưa dùng |
| Order | Có trong schema | `promoCode` và `discount` đã có cột; `userId` trong schema đang tùy chọn, thiết kế yêu cầu bắt buộc (SRS FR-07) |
| OrderItem | Có trong schema | `size` lưu `String` trong schema, giá trị hợp lệ S/M/L kiểm tra bằng DTO; sơ đồ biểu diễn bằng enum `Size` |
| Payment | Có trong schema | `idempotencyKey` duy nhất, đảm bảo FR-10 |
| Promotion | **Thiết kế mới** | Thay cho `promoCode` chỉ là chuỗi; liên kết đến `Order` qua mã (FR-08) |
| LoyaltyTransaction | **Thiết kế mới** | Ghi lịch sử cộng/trừ điểm (FR-14) |
| Enum OrderStatus, PaymentMethod, PaymentStatus | Có trong schema | Trạng thái đơn gồm 7 giá trị |
| Enum LoyaltyType | **Thiết kế mới** | Loại giao dịch điểm (FR-14) |

## Multiplicity (lý do)

| Quan hệ | Multiplicity | Lý do |
|---|---|---|
| User – Order | 1 : 0..* | Một người dùng có nhiều đơn; mỗi đơn thuộc đúng một người dùng (đặt đơn cần đăng nhập) |
| Order – OrderItem | 1 : 1..* | Đơn có ít nhất một dòng hàng; là composition vì xóa đơn thì xóa dòng hàng (`onDelete: Cascade`) |
| OrderItem – Product | 0..* : 1 | Một sản phẩm xuất hiện trong nhiều dòng hàng |
| Order – Payment | 1 : 0..* | Một đơn có thể có nhiều lần thử thanh toán (thất bại rồi thử lại) |
| Order – Promotion | 0..* : 0..1 | Mỗi đơn dùng tối đa một mã |
| User – LoyaltyTransaction | 1 : 0..* | Lịch sử điểm của một người dùng |
| LoyaltyTransaction – Order | 0..* : 0..1 | Điểm có thể phát sinh từ một đơn, hoặc từ nguồn khác |

## Truy vết

- Order, OrderItem, Product: FR-01 đến FR-04, FR-07, FR-11, FR-12
- Payment: FR-09, FR-10
- User: FR-05, FR-06, FR-13 (vai trò nhân viên theo ADR-007)
- Promotion: FR-08
- LoyaltyTransaction: FR-14
