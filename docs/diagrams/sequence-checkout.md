# Sequence diagram UC-04 – ghi chú

Sơ đồ: `docs/diagrams/sequence-checkout.puml` (ảnh: `docs/diagrams/sequence-checkout.svg`)

Lifeline: Customer, Next.js UI, NestJS API, Database (PostgreSQL), Payment Service (mock gateway).

## Đối chiếu với yêu cầu của đề (Task 2.2)

| Yêu cầu của đề | Bước trong sơ đồ |
|---|---|
| Request/response và thứ tự gọi API | 2 (`POST /orders`) rồi 23 (`POST /payments`) |
| Kiểm tra JWT | 3 và 24 |
| Validate dữ liệu | 6 và 24 |
| Transaction khi tạo đơn và cập nhật tồn kho | 12 đến 18 |
| Nhánh `alt` thanh toán thành công hoặc thất bại | 36 đến 42 và 43 đến 49 |
| Idempotency khi client gửi lại yêu cầu thanh toán | 31 đến 34 |
| Thông báo kết quả cuối cùng cho người dùng | 20, 42, 49 và các nhánh lỗi |

## Hiện trạng code so với thiết kế

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| 3, 24 Kiểm tra JWT | Đã có | `AuthGuard` đặt ở cấp controller |
| 6 Validate DTO | Đã có | `CreateOrderDto`: size S/M/L, topping hợp lệ, `qty` 1 đến 20, 1 đến 50 dòng |
| 9 đến 11 Lấy sản phẩm và tính giá ở server | Đã có | `calcUnitPrice` trong `pricing.ts` |
| 12 đến 18 Transaction trừ tồn kho | **Thiết kế Sprint 2** | `orders.service.ts` hiện chỉ gọi `order.create`, chưa trừ `stock` |
| 25 đến 30 Kiểm tra đơn và trạng thái | Đã có | `payments.service.ts`: 404 nếu sai chủ, 409 nếu sai trạng thái |
| 31 đến 34 Idempotency | **Thiết kế Sprint 2** | Cột `idempotencyKey` đã có trong schema nhưng service chưa đọc |
| 35 đến 49 Gọi cổng thanh toán, ghi `Payment`, đổi trạng thái đơn | Đã có | Hai thao tác ghi nằm trong một `$transaction` |

## Truy vết

- Yêu cầu: FR-07, FR-09, FR-10, FR-11, NFR-02, NFR-03, NFR-06
- Tiêu chí chấp nhận (UC-04): AC-01 đến AC-08
- Backlog Sprint 2: mục 1 (trừ tồn kho trong transaction) và mục 2 (idempotency)

## Hạn chế đã biết (ghi lại cho ADR ở Task 3)

Cổng thanh toán được gọi **trước** khi ghi vào cơ sở dữ liệu. Nếu việc ghi thất bại sau khi cổng đã tính tiền thì hệ thống mất dấu giao dịch. Cách giảm thiểu: ghi trước một bản `Payment` ở trạng thái chờ rồi mới gọi cổng, hoặc đối soát định kỳ. Nội dung này sẽ được ghi thành một ADR.
