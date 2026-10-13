# Class diagram (domain) – ghi chú

Sơ đồ: `docs/diagrams/class-domain.puml` (ảnh: `docs/diagrams/class-domain.svg`)

## Đối chiếu với schema Prisma

| Lớp | Nguồn | Ghi chú |
|---|---|---|
| User | Có trong schema | Thiết kế thêm `role : Role` (FR-13). `loyaltyPoints` đã có |
| Product | Có trong schema | `stock` và `version` dùng để kiểm soát tồn kho (NFR-06) |
| Order | Có trong schema | `promoCode` và `discount` đã có cột; `userId` trong schema đang tùy chọn, thiết kế yêu cầu bắt buộc (SRS FR-07) |
| OrderItem | Có trong schema | `size` lưu `String` trong schema, giá trị hợp lệ S/M/L kiểm tra bằng DTO; sơ đồ biểu diễn bằng enum `Size` |
| Payment | Có trong schema | `idempotencyKey` duy nhất, đảm bảo FR-10 |
| Promotion | **Thiết kế mới** | Thay cho `promoCode` chỉ là chuỗi; liên kết đến `Order` qua mã (FR-08) |
| LoyaltyTransaction | **Thiết kế mới** | Ghi lịch sử cộng/trừ điểm (FR-14) |
| Enum OrderStatus, PaymentMethod, PaymentStatus | Có trong schema | Trạng thái đơn gồm 7 giá trị |
| Enum Role, LoyaltyType | **Thiết kế mới** | Hỗ trợ phân quyền nhân viên và loại giao dịch điểm |

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
- User, Role: FR-05, FR-06, FR-13
- Promotion: FR-08
- LoyaltyTransaction: FR-14
